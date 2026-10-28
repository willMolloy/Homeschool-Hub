import { buildCapacityModel, type CapacityModel } from "./capacity";
import { EngineInputError, fromDayNumber, isValidLocalDate, toDayNumber, weekStartOfDayNumber } from "./dates";
import { weightPerUnitOf } from "./weights";
import { ENGINE_VERSION } from "./version";
import type { Assignment, ChildPlan, DayKind, DayLoad, OverrideMode, PlanContext, PlanWarning, SubjectWeight, WeekOverride } from "./types";

/** Floating-point tolerance for "nothing left". */
export const EPS = 1e-9;
/** pushEndDate never extends more than this many days past the planned end. */
export const MAX_PUSH_DAYS = 730;

const finiteOr0 = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);

function validateAssignment(a: Assignment): void {
  if (!a || typeof a.id !== "string" || a.id === "") throw new EngineInputError("Assignment needs an id");
  if (!isValidLocalDate(a.start)) throw new EngineInputError(`Assignment ${a.id}: invalid start ${JSON.stringify(a.start)}`);
  if (!isValidLocalDate(a.end)) throw new EngineInputError(`Assignment ${a.id}: invalid end ${JSON.stringify(a.end)}`);
  if (typeof a.totalUnits !== "number" || !Number.isFinite(a.totalUnits) || a.totalUnits < 0)
    throw new EngineInputError(`Assignment ${a.id}: totalUnits must be a finite number >= 0`);
}

interface PreparedOverride {
  w0: number; // first day of week
  w1: number; // last day of week
  plannedUnits: number;
  mode: OverrideMode;
}

function prepareOverrides(a: Assignment, childId: string, ctx: PlanContext, warn: (w: PlanWarning) => void): PreparedOverride[] {
  const mine = (ctx.overrides ?? []).filter((o: WeekOverride) => o.assignmentId === a.id && (o.childId == null || o.childId === childId));
  const byWeek = new Map<number, PreparedOverride>();
  for (const o of mine) {
    const d = toDayNumber(o.weekStart);
    const w0 = weekStartOfDayNumber(d, ctx.calendar.weekStart);
    if (w0 !== d) warn("override-misaligned");
    if (byWeek.has(w0)) warn("override-duplicate-week"); // later entry wins; it is the newer edit
    byWeek.delete(w0); // keep insertion order = edit order
    byWeek.set(w0, { w0, w1: w0 + 6, plannedUnits: Math.max(0, finiteOr0(o.plannedUnits)), mode: o.mode });
  }
  return [...byWeek.values()];
}

/** The assignment's subject default for its own unit type, if the context has one (S2b-32). */
function subjectDefaultFor(a: Assignment, ctx: PlanContext): SubjectWeight | null {
  return ctx.subjectWeights?.find((w) => w.subjectId === a.subjectId && w.unitType === a.unitType) ?? null;
}

/**
 * Plan one assignment for one child.
 *
 * - capacity(d) comes from the calendar, blocked periods, and events (see capacity.ts).
 * - remaining = totalUnits - everything logged for this child.
 * - Override weeks are fixed first: their units are spread over that week's capacity.
 * - keepEndDate: rate = remaining after overrides / sum of capacity on the other days up to the end.
 * - pushEndDate: the other days keep the old pace (baseRate) and the end moves to where the work runs out.
 * - The rate is an output only; nothing here is meant to be persisted.
 * Never returns NaN or Infinity: impossible plans report unplacedUnits and a warning instead.
 */
export function planChild(a: Assignment, childId: string, ctx: PlanContext, model?: CapacityModel): ChildPlan {
  validateAssignment(a);
  const warnings: PlanWarning[] = [];
  const warn = (w: PlanWarning): void => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  const cap = model ?? buildCapacityModel(ctx.calendar, ctx.events, ctx.blocked);
  const { weight, source: weightSource } = weightPerUnitOf(a, subjectDefaultFor(a, ctx));

  const S = toDayNumber(a.start);
  const E = toDayNumber(a.end);
  const total = a.totalUnits;

  // Progress
  const logs = (ctx.progress ?? []).filter((p) => p.assignmentId === a.id && p.childId === childId);
  const loggedByDay = new Map<number, number>();
  let done = 0;
  for (const p of logs) {
    const u = finiteOr0(p.units);
    const d = toDayNumber(p.date);
    loggedByDay.set(d, (loggedByDay.get(d) ?? 0) + u);
    done += u;
  }
  done = Math.max(0, done);
  const remaining = Math.max(0, total - done);
  const complete = remaining <= EPS;

  const asOf = ctx.asOf ? toDayNumber(ctx.asOf) : S;
  const planFrom = Math.max(S, asOf);

  const planned = new Map<number, number>();
  const kinds = new Map<number, DayKind>();
  let baseRate = 0;
  let rate = 0;
  let endDay = E;
  let unplaced = 0;
  let noCapacity = false;
  let mode: OverrideMode | null = null;

  if (E < S) {
    warn("invalid-range");
    unplaced = remaining;
    noCapacity = remaining > EPS;
  } else if (!complete) {
    const capOf = new Map<number, number>();
    const c = (d: number): number => {
      let v = capOf.get(d);
      if (v === undefined) {
        v = cap.capacity(d, childId, a.subjectId);
        capOf.set(d, v);
      }
      return v;
    };
    let baseCap = 0;
    for (let d = planFrom; d <= E; d += 1) baseCap += c(d);
    if (planFrom > E) warn("past-end");

    if (baseCap <= EPS) {
      // Nothing can be placed before the end date (fully inside a vacation, every day skipped, or already past the end).
      noCapacity = true;
      unplaced = remaining;
      warn("no-capacity");
      for (const o of prepareOverrides(a, childId, ctx, warn)) if (o.w1 >= planFrom) warn("override-no-capacity");
    } else {
      baseRate = remaining / baseCap;
      // Fixed override weeks, chronological so earlier weeks claim units first.
      const overrides = prepareOverrides(a, childId, ctx, warn);
      const fixed = new Set<number>();
      const applied = new Set<PreparedOverride>();
      let left = remaining;
      let lastMode: OverrideMode | null = null;
      for (const o of [...overrides].sort((x, y) => x.w0 - y.w0)) {
        const from = Math.max(o.w0, planFrom);
        const to = Math.min(o.w1, E);
        if (from > to) {
          warn("override-outside-range");
          continue;
        }
        let weekCap = 0;
        for (let d = from; d <= to; d += 1) weekCap += c(d);
        if (weekCap <= EPS) {
          warn("override-no-capacity");
          continue;
        }
        let units = o.plannedUnits;
        if (units > left) {
          warn("override-clamped");
          units = left;
        }
        for (let d = from; d <= to; d += 1) {
          fixed.add(d);
          kinds.set(d, "override");
          planned.set(d, (units * c(d)) / weekCap);
        }
        left -= units;
        applied.add(o);
      }
      // Mode = the most recent edit: the last applied override in input (edit) order.
      for (const o of overrides) if (applied.has(o)) lastMode = o.mode;
      mode = lastMode;

      if (mode === "pushEndDate") {
        rate = baseRate;
        let last = -Infinity;
        for (const d of fixed) if ((planned.get(d) ?? 0) > EPS) last = Math.max(last, d);
        const limit = E + MAX_PUSH_DAYS;
        for (let d = planFrom; d <= limit && left > EPS; d += 1) {
          if (fixed.has(d)) continue;
          const v = Math.min(rate * c(d), left);
          if (v > 0) {
            planned.set(d, v);
            kinds.set(d, "planned");
            left -= v;
            last = Math.max(last, d);
          }
        }
        if (left > EPS) {
          warn("push-horizon-exceeded");
          unplaced = left;
        } else left = 0;
        endDay = Number.isFinite(last) ? last : E;
      } else {
        let freeCap = 0;
        for (let d = planFrom; d <= E; d += 1) if (!fixed.has(d)) freeCap += c(d);
        if (freeCap > EPS) {
          rate = left / freeCap;
          for (let d = planFrom; d <= E; d += 1) {
            if (fixed.has(d)) continue;
            planned.set(d, rate * c(d));
            kinds.set(d, "planned");
          }
        } else if (left > EPS) {
          warn("keep-no-free-capacity");
          unplaced = left;
        }
        endDay = E;
      }
    }
  }

  // Output range: start..max(end, effective end) plus any logged days outside it.
  let lo = S;
  let hi = Math.max(E, endDay);
  for (const d of loggedByDay.keys()) {
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  const days: DayLoad[] = [];
  for (let d = lo; d <= hi; d += 1) {
    const isPast = d < planFrom;
    const logged = loggedByDay.get(d) ?? 0;
    // A day's net logged work is shown as at least 0 (a correction can't draw a negative bar).
    const units = isPast ? Math.max(0, logged) : planned.get(d) ?? 0;
    const kind: DayKind = isPast ? "logged" : kinds.get(d) ?? "planned";
    const inRange = d >= S && d <= Math.max(E, endDay);
    days.push({
      date: fromDayNumber(d),
      capacity: inRange ? cap.capacity(d, childId, a.subjectId) : 0,
      schoolDay: cap.schoolDay(d, childId),
      units,
      thickness: units * weight,
      kind,
    });
  }

  return {
    engineVersion: ENGINE_VERSION,
    assignmentId: a.id,
    childId,
    subjectId: a.subjectId,
    unitType: a.unitType,
    weightPerUnit: weight,
    weightSource,
    totalUnits: total,
    doneUnits: done,
    remainingUnits: remaining,
    baseRate,
    rate,
    plannedEnd: a.end,
    end: fromDayNumber(endDay),
    mode,
    unplacedUnits: unplaced,
    noCapacity,
    complete,
    days,
    warnings,
  };
}

/** One ChildPlan per child on the assignment. Shared assignments track each child separately. */
export function planAssignment(a: Assignment, ctx: PlanContext, model?: CapacityModel): ChildPlan[] {
  validateAssignment(a);
  const m = model ?? buildCapacityModel(ctx.calendar, ctx.events, ctx.blocked);
  const kids = [...new Set(a.childIds ?? [])];
  return kids.map((k) => planChild(a, k, ctx, m));
}

/** Plan many assignments with one shared capacity model. */
export function planAll(assignments: Assignment[], ctx: PlanContext): ChildPlan[] {
  const m = buildCapacityModel(ctx.calendar, ctx.events, ctx.blocked);
  return assignments.flatMap((a) => planAssignment(a, ctx, m));
}
