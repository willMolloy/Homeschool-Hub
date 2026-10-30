import { buildCapacityModel, type CapacityModel } from "./capacity";
import { applyCheckIns, lastCheckInWeekEnd } from "./checkins";
import { EngineInputError, fromDayNumber, isValidLocalDate, toDayNumber, weekdayOfDayNumber } from "./dates";
import { EPS, MAX_PUSH_DAYS, placeSegment, prepareOverrides, type Placement } from "./placement";
import { pastMissedDays } from "./missed";
import { replanFrom } from "./reanchor";
import { weekdaysOf } from "./weekdays";
import { weightPerUnitOf } from "./weights";
import { ENGINE_VERSION } from "./version";
import type { Assignment, ChildPlan, DayKind, DayLoad, PlanContext, PlanWarning, SubjectWeight } from "./types";

export { EPS, MAX_PUSH_DAYS } from "./placement";

function validateAssignment(a: Assignment): void {
  if (!a || typeof a.id !== "string" || a.id === "") throw new EngineInputError("Assignment needs an id");
  if (!isValidLocalDate(a.start)) throw new EngineInputError(`Assignment ${a.id}: invalid start ${JSON.stringify(a.start)}`);
  if (!isValidLocalDate(a.end)) throw new EngineInputError(`Assignment ${a.id}: invalid end ${JSON.stringify(a.end)}`);
  if (typeof a.totalUnits !== "number" || !Number.isFinite(a.totalUnits) || a.totalUnits < 0)
    throw new EngineInputError(`Assignment ${a.id}: totalUnits must be a finite number >= 0`);
}

/** The assignment's subject default for its own unit type, if the context has one (S2b-32). */
function subjectDefaultFor(a: Assignment, ctx: PlanContext): SubjectWeight | null {
  return ctx.subjectWeights?.find((w) => w.subjectId === a.subjectId && w.unitType === a.unitType) ?? null;
}

/**
 * Plan one assignment for one child.
 *
 * - capacity(d) comes from the calendar, blocked periods, and events (see capacity.ts); it is 0 on a weekday
 *   outside the assignment's own, else its subject's, weekdays (S4-01).
 * - The plan runs from the assignment's start, as if every scheduled day before today was done (S2b-18).
 *   Logs don't move bars; `ctx.asOf` only labels earlier days `assumed`.
 * - Override weeks are fixed first: their units are spread over that week's capacity.
 * - keepEndDate: rate = remaining after overrides / sum of capacity on the other days up to the end.
 * - pushEndDate: the other days keep the old pace (baseRate) and the end moves to where the work runs out.
 * - Check-ins (S2b-20) re-anchor the plan after their week and replan what is left (checkins.ts).
 * - The rate is an output only; nothing here is meant to be persisted.
 * Never returns NaN or Infinity: impossible plans report unplacedUnits and a warning instead.
 */
export function planChild(a: Assignment, childId: string, ctx: PlanContext, model?: CapacityModel): ChildPlan {
  validateAssignment(a);
  const warnings: PlanWarning[] = [];
  const warn = (w: PlanWarning): void => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  const fullCap = model ?? buildCapacityModel(ctx.calendar, ctx.events, ctx.blocked);
  const { weight, source: weightSource } = weightPerUnitOf(a, subjectDefaultFor(a, ctx));

  const { weekdays, source: weekdaysSource } = weekdaysOf(a, ctx);
  const onWeekdays = weekdays ? new Set<number>(weekdays) : null;

  const S = toDayNumber(a.start);
  const E = toDayNumber(a.end);
  const total = a.totalUnits;
  const asOf = ctx.asOf ? toDayNumber(ctx.asOf) : S;

  // S4-00: a missed day on or before asOf is not a plain day off. The plan is built as if it were not missed,
  // then re-anchored on it (below); until then the capacity model leaves it out.
  const missed = pastMissedDays(ctx.blocked, childId, S, asOf);
  const cap = missed ? buildCapacityModel(ctx.calendar, ctx.events, missed.rest) : fullCap;
  const zeroed = new Set<number>();

  const capOf = new Map<number, number>();
  const c = (d: number): number => {
    if (zeroed.has(d) || (onWeekdays && !onWeekdays.has(weekdayOfDayNumber(d)))) return 0;
    let v = capOf.get(d);
    if (v === undefined) {
      v = cap.capacity(d, childId, a.subjectId);
      capOf.set(d, v);
    }
    return v;
  };

  let p: Placement;
  let done = 0;
  let finishedEarly = false;
  let checkInWeeks: string[] = [];
  if (E < S) {
    warn("invalid-range");
    p = { planned: new Map(), kinds: new Map(), baseRate: 0, rate: 0, endDay: E, unplaced: total, noCapacity: total > EPS, mode: null };
  } else {
    const overrides = prepareOverrides(a, childId, ctx.overrides, ctx.calendar, warn);
    p = placeSegment({ from: S, end: E, pushLimit: E + MAX_PUSH_DAYS, remaining: total, overrides, first: true }, c, warn);
    // A missed day that has work: keep the plan before it, put 0 on it, replan the rest (S4-00). Check-ins are
    // authoritative (S2b-38), so days up to the last check-in's week are handled first and the check-ins then
    // re-anchor over them; later ones are handled on top of the check-ins.
    const lastCheckIn = lastCheckInWeekEnd(a, childId, ctx.checkIns, ctx.calendar);
    const missMissedDay = (d: number): void => {
      const worked = (p.planned.get(d) ?? 0) > EPS;
      zeroed.add(d);
      if (worked) replanFrom(p, d, d + 1, total, overrides, c, E + MAX_PUSH_DAYS, warn);
    };
    const missedDays = missed?.days ?? [];
    for (const d of missedDays) if (d <= lastCheckIn) missMissedDay(d);
    const ci = applyCheckIns(p, { a, childId, calendar: ctx.calendar, checkIns: ctx.checkIns, S, E, overrides, c, warn });
    for (const d of missedDays) if (d > lastCheckIn) missMissedDay(d);
    ({ done, finishedEarly, checkInWeeks } = ci);
  }
  const remaining = Math.max(0, total - done);

  // Output range: start..max(end, effective end, any placed day). Days before asOf are labelled assumed.
  let hi = Math.max(E, p.endDay);
  for (const d of p.planned.keys()) hi = Math.max(hi, d);
  const days: DayLoad[] = [];
  let position = 0;
  for (let d = S; d <= hi; d += 1) {
    const units = p.planned.get(d) ?? 0;
    position += units;
    const kind: DayKind = d < asOf ? "assumed" : p.kinds.get(d) ?? "planned";
    days.push({
      date: fromDayNumber(d),
      capacity: c(d),
      schoolDay: fullCap.schoolDay(d, childId),
      units,
      thickness: units * weight,
      kind,
      position,
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
    weekdays,
    weekdaysSource,
    totalUnits: total,
    doneUnits: done,
    remainingUnits: remaining,
    baseRate: p.baseRate,
    rate: p.rate,
    plannedEnd: a.end,
    end: fromDayNumber(p.endDay),
    mode: p.mode,
    unplacedUnits: p.unplaced,
    noCapacity: p.noCapacity,
    complete: total <= EPS || (checkInWeeks.length > 0 && remaining <= EPS),
    finishedEarly,
    checkInWeeks,
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
