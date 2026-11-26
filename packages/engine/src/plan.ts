import { buildCapacityModel, type CapacityModel } from "./capacity";
import { applyCheckIns, lastCheckInWeekEnd } from "./checkins";
import { EngineInputError, fromDayNumber, isValidLocalDate, toDayNumber, weekdayOfDayNumber } from "./dates";
import { EPS, MAX_PUSH_DAYS, placeSegment, prepareOverrides, type Placement } from "./placement";
import { pastMissedDays } from "./missed";
import { replanFrom } from "./reanchor";
import { validWeekdays, weekdaysOf } from "./weekdays";
import { weightPerUnitOf } from "./weights";
import { closePlan } from "./ended";
import { ENGINE_VERSION } from "./version";
import type { Assignment, ChildPlan, DayKind, DayLoad, LocalDate, PlanContext, PlanWarning, SubjectWeight } from "./types";

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
 *   Logs don't move bars; `ctx.asOf` labels earlier days `assumed` and (S7b-18) is where a last-week adjustment may start pulling work back.
 * - Override weeks are fixed first: their units are spread over that week's capacity.
 * - keepEndDate (S7b-09): anchored at each adjusted week. Days before the first one keep the plan without it, the week
 *   gets its units, and the rest is spread over the days after it up to the end (next adjusted week anchors there in turn).
 *   An adjustment in the last week, with no day after it, pulls the rest back only into the days from asOf (S7b-18), never the
 *   days before; with none free from asOf the end moves later at the old pace ("keep-end-extended").
 * - pushEndDate: the other days keep the old pace (baseRate) and the end moves to where the work runs out.
 * - Check-ins (S2b-20) re-anchor the plan after their week and replan what is left (checkins.ts).
 * - The rate is an output only; nothing here is meant to be persisted.
 * Never returns NaN or Infinity: impossible plans report unplacedUnits and a warning instead.
 */
/** The assignment as this child sees it: their end and ending, or the book's when they have no row of their own. */
function assignmentForChild(source: Assignment, childId: string): Assignment {
  const row = source.childSchedules?.find((s) => s.childId === childId);
  if (!row) return source;
  if (!isValidLocalDate(row.end)) throw new EngineInputError(`Assignment ${source.id}: invalid end ${JSON.stringify(row.end)} for ${childId}`);
  return {
    ...source,
    end: row.end,
    endedAs: row.endedAs === undefined ? source.endedAs : row.endedAs,
    endedOn: row.endedOn === undefined ? source.endedOn : row.endedOn,
    childSchedules: undefined,
  };
}

export function planChild(source: Assignment, childId: string, ctx: PlanContext, model?: CapacityModel): ChildPlan {
  const a = assignmentForChild(source, childId);
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
  const sharedEnd = toDayNumber(source.end);
  let total = source.totalUnits;
  const asOf = ctx.asOf ? toDayNumber(ctx.asOf) : S;

  // S4-00: a missed day on or before asOf is not a plain day off. The plan is built as if it were not missed,
  // then re-anchored on it (below); until then the capacity model leaves it out.
  const missed = pastMissedDays(ctx.blocked, childId, S, asOf);
  const cap = missed ? buildCapacityModel(ctx.calendar, ctx.events, missed.rest) : fullCap;
  const zeroed = new Set<number>();

  // S4-01b: from `weekdaysFrom` on, the weekdays above apply; before it, `previousWeekdays` (null = every school day).
  // Until the change is applied (below) the plan is built as if it had never happened. A change that doesn't
  // lie after the start, or that changes nothing, is ignored.
  const from = typeof a.weekdaysFrom === "string" && isValidLocalDate(a.weekdaysFrom) ? toDayNumber(a.weekdaysFrom) : null;
  const previous = validWeekdays(a.previousWeekdays);
  const changesDays = from !== null && from > S && (previous?.join() ?? "") !== (weekdays?.join() ?? "");
  const beforeChange = changesDays && previous ? new Set<number>(previous) : changesDays ? null : onWeekdays;
  let switchedAt = Infinity; // first day the current weekdays apply

  const capOf = new Map<number, number>();
  const c = (d: number): number => {
    const mask = d >= switchedAt ? onWeekdays : beforeChange;
    if (zeroed.has(d) || (mask && !mask.has(weekdayOfDayNumber(d)))) return 0;
    let v = capOf.get(d);
    if (v === undefined) {
      v = cap.capacity(d, childId, a.subjectId);
      capOf.set(d, v);
    }
    return v;
  };

  // S22-02: a minutes book stores one total for the longest span. A child with a different end keeps the same
  // minutes a day, so their total is that daily amount times their own school days.
  if (a.unitType === "minutes" && E !== sharedEnd && sharedEnd >= S && E >= S) {
    const schoolWeek = new Set<number>(ctx.calendar.schoolDays);
    const schoolDaysUntil = (endDay: number): number => {
      let n = 0;
      for (let d = S; d <= endDay; d += 1) {
        const wd = weekdayOfDayNumber(d);
        if (schoolWeek.has(wd) && (!beforeChange || beforeChange.has(wd))) n += 1;
      }
      return n;
    };
    const full = schoolDaysUntil(sharedEnd);
    const mine = schoolDaysUntil(E);
    if (full > EPS) total = (source.totalUnits / full) * mine;
  }

  // S20-01: minutes are a daily amount. A blocked or skipped day drops that day; it does not thicken the others.
  // The stored total is the daily amount times the school days in the dates (blocks ignored). When some of
  // those days have no capacity, place only what the remaining days hold at the same daily rate.
  if (a.unitType === "minutes" && E >= S) {
    const schoolWeek = new Set<number>(ctx.calendar.schoolDays);
    let nominal = 0;
    let actual = 0;
    for (let d = S; d <= E; d += 1) {
      const wd = weekdayOfDayNumber(d);
      if (schoolWeek.has(wd) && (!beforeChange || beforeChange.has(wd))) nominal += 1;
      actual += c(d);
    }
    if (nominal > EPS && nominal - actual > 1e-4) total = (total / nominal) * actual;
  }

  let p: Placement;
  let done = 0;
  let finishedEarly = false;
  let checkInWeeks: string[] = [];
  let adjustedWeeks: LocalDate[] = [];
  if (E < S) {
    warn("invalid-range");
    p = { planned: new Map(), kinds: new Map(), baseRate: 0, rate: 0, endDay: E, unplaced: total, noCapacity: total > EPS, mode: null };
  } else {
    const overrides = prepareOverrides(a, childId, ctx.overrides, ctx.calendar, warn);
    adjustedWeeks = overrides.map((o) => fromDayNumber(o.w0)).sort();
    p = placeSegment({ from: S, end: E, pushLimit: E + MAX_PUSH_DAYS, remaining: total, overrides, first: true, notBefore: asOf }, c, warn);
    // Re-anchoring events: a missed day that has work (keep the plan before it, put 0 on it, replan the rest, S4-00)
    // and a change of weekdays (keep the plan before it, replan the rest on the new days, S4-01b). Check-ins are
    // authoritative (S2b-38), so events up to the last check-in's week are handled first and the check-ins then
    // re-anchor over them; later ones are handled on top of the check-ins.
    interface Anchor { cut: number; from: number; apply: () => void; onlyIfWorked: boolean }
    const anchors: Anchor[] = [];
    if (changesDays) anchors.push({ cut: from!, from: from!, apply: () => { switchedAt = from!; }, onlyIfWorked: false });
    for (const d of missed?.days ?? []) anchors.push({ cut: d, from: d + 1, apply: () => { zeroed.add(d); }, onlyIfWorked: true });
    anchors.sort((x, y) => x.cut - y.cut); // stable: a weekday change goes before a missed day on the same date
    const reanchor = (x: Anchor): void => {
      const worked = (p.planned.get(x.cut) ?? 0) > EPS;
      x.apply();
      if (worked || !x.onlyIfWorked) replanFrom(p, x.cut, x.from, total, overrides, c, E + MAX_PUSH_DAYS, warn, asOf);
    };
    const lastCheckIn = lastCheckInWeekEnd(a, childId, ctx.checkIns, ctx.calendar);
    for (const x of anchors) if (x.cut <= lastCheckIn) reanchor(x);
    const ci = applyCheckIns(p, { a, childId, calendar: ctx.calendar, checkIns: ctx.checkIns, S, E, overrides, c, warn, notBefore: asOf });
    for (const x of anchors) if (x.cut > lastCheckIn) reanchor(x);
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

  return closePlan({
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
    adjustedWeeks,
    weekdaysFrom: changesDays ? fromDayNumber(from!) : null,
    previousWeekdays: changesDays ? previous : null,
    days,
    warnings,
  }, a);
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
