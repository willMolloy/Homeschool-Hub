/**
 * Pure helpers behind the weekly briefing (S4-08): when an assignment will finish at the child's actual pace, and
 * whether a week is heavy for a child. They only read plans the engine already made.
 */
import { fromDayNumber, toDayNumber, weekdayOfDayNumber, weekStartOfDayNumber } from "./dates";
import { EPS, MAX_PUSH_DAYS } from "./placement";
import type { ChildPlan, FamilyCalendar, LocalDate, ProgressCheckIn } from "./types";

/** A week counts as heavy when its load is at least this many times the child's average week (S4-08). */
export const HEAVY_WEEK_RATIO = 1.5;

/**
 * S7-10: what `forecastOutcome` found: a finish date, or `beyondLimit` when the pace is so slow the work doesn't
 * finish within the push limit (MAX_PUSH_DAYS) of the last check-in week.
 */
export type FinishForecast = { finish: LocalDate } | { beyondLimit: true } | null;

/**
 * What the check-ins show about a child's real pace (S4-08, S7b-04), or null when there is not enough to say.
 *
 * S7b-04 rules:
 * - A check-in week the parent adjusted on purpose (`plan.adjustedWeeks`: a week adjustment for this assignment and
 *   child) is left out: a deliberately light or heavy week is not the child's pace. Fewer than 2 weeks left means null.
 * - The pace is units per scheduled day: each included week's gain (the position at its end less the position before
 *   it) over that week's capacity, on the assignment's own days at that time.
 * - When the days changed mid-assignment (S4-01b, `plan.weekdaysFrom`), the pace is measured from the change onward if
 *   at least 2 check-in weeks lie after it. Otherwise it is measured on the weeks before the change and carried over
 *   as a weekly pace (`scale`: old days a week over new days a week), so a weekday change on its own never moves the forecast.
 */
interface Observed {
  /** Units per scheduled day, as measured. */
  pace: number;
  /** Multiplier for projecting onto the plan's current days (1 unless the pace was measured on the old days). */
  scale: number;
  /** Last day (number) of the latest applied check-in week, adjusted weeks included. */
  last: number;
}

function observedPace(plan: ChildPlan, checkIns: ProgressCheckIn[] | undefined, calendar: FamilyCalendar): Observed | null {
  const applied = new Set(plan.checkInWeeks);
  const all = new Set<number>();
  for (const ci of checkIns ?? []) {
    if (ci.assignmentId !== plan.assignmentId || ci.childId !== plan.childId) continue;
    const w0 = fromDayNumber(weekStartOfDayNumber(toDayNumber(ci.weekStart), calendar.weekStart));
    if (applied.has(w0)) all.add(toDayNumber(w0));
  }
  if (all.size === 0 || plan.remainingUnits <= EPS || plan.days.length === 0) return null;
  const adjusted = new Set((plan.adjustedWeeks ?? []).map((w) => weekStartOfDayNumber(toDayNumber(w), calendar.weekStart)));
  let weeks = [...all].filter((w) => !adjusted.has(w)).sort((x, y) => x - y);

  let scale = 1;
  if (plan.weekdaysFrom) {
    const change = toDayNumber(plan.weekdaysFrom);
    const after = weeks.filter((w) => w >= change);
    const before = weeks.filter((w) => w < change);
    if (after.length >= 2) weeks = after;
    else if (before.length >= 2) {
      weeks = before;
      const school = new Set<number>(calendar.schoolDays);
      const count = (days: readonly number[] | null) => (days ? days.filter((d) => school.has(d)).length : school.size);
      const was = count(plan.previousWeekdays);
      const now = count(plan.weekdays);
      if (was > 0 && now > 0) scale = was / now;
    }
  }
  if (weeks.length < 2) return null;

  const position = new Map(plan.days.map((d) => [toDayNumber(d.date), d.position] as const));
  const firstDay = toDayNumber(plan.days[0]!.date);
  const lastDay = toDayNumber(plan.days[plan.days.length - 1]!.date);
  const at = (n: number) => (n < firstDay ? 0 : position.get(Math.min(n, lastDay)) ?? 0);
  let gain = 0;
  let capacity = 0;
  for (const w of weeks) {
    gain += at(w + 6) - at(w - 1);
    for (const d of plan.days) {
      const n = toDayNumber(d.date);
      if (n >= w && n <= w + 6) capacity += d.capacity;
    }
  }
  if (capacity <= EPS) return null;
  return { pace: gain / capacity, scale, last: Math.max(...all) + 6 };
}

/**
 * The projected finish date at the pace the check-ins show (S4-08), or null: fewer than 2 check-in weeks for this
 * assignment and child (S7b-04: not counting weeks the parent adjusted on purpose), a pace that is on plan or ahead,
 * no progress at all (the caller says "no recent progress"), or nothing left. Never NaN or Infinity.
 *
 * - Observed pace: see `observedPace` (units per scheduled day on the assignment's own days; S7b-04 rules there).
 * - Planned pace: the total over the capacity between the start and the planned end.
 * - The remaining units are then placed at the observed pace after the last check-in week, on the plan's capacity
 *   days, and past the plan's last day on the calendar's school days that are also the assignment's days.
 *
 * S7-10: `forecastFinish` keeps the date-or-null answer; a pace too slow to finish within MAX_PUSH_DAYS is `null`
 * there, and `{ beyondLimit: true }` from `forecastOutcome`, so the briefing can still say it won't finish.
 */
export function forecastFinish(plan: ChildPlan, checkIns: ProgressCheckIn[] | undefined, calendar: FamilyCalendar): LocalDate | null {
  const f = forecastOutcome(plan, checkIns, calendar);
  return f && "finish" in f ? f.finish : null;
}

/** S7-10: `forecastFinish`, telling "gave up: too slow" apart from "nothing to forecast" (null). */
export function forecastOutcome(plan: ChildPlan, checkIns: ProgressCheckIn[] | undefined, calendar: FamilyCalendar): FinishForecast {
  const seen = observedPace(plan, checkIns, calendar);
  if (!seen) return null;
  let plannedCapacity = 0;
  for (const d of plan.days) if (d.date <= plan.plannedEnd) plannedCapacity += d.capacity;
  if (plannedCapacity <= EPS) return null;
  const planned = plan.totalUnits / plannedCapacity;
  const observed = seen.pace * seen.scale;
  if (!Number.isFinite(observed) || !Number.isFinite(planned) || seen.pace <= EPS || observed >= planned - EPS) return null;

  const last = seen.last;
  const capacityOf = new Map(plan.days.map((d) => [toDayNumber(d.date), d.capacity] as const));
  const lastPlanDay = toDayNumber(plan.days[plan.days.length - 1]!.date);
  const ownDays = plan.weekdays ? new Set<number>(plan.weekdays) : null;
  const schoolDays = new Set<number>(calendar.schoolDays);
  let left = plan.remainingUnits;
  for (let n = last + 1; n <= last + 1 + MAX_PUSH_DAYS; n += 1) {
    const wd = weekdayOfDayNumber(n);
    const cap = n <= lastPlanDay ? capacityOf.get(n) ?? 0 : schoolDays.has(wd) && (!ownDays || ownDays.has(wd)) ? 1 : 0;
    left -= observed * cap;
    if (left <= EPS) return { finish: fromDayNumber(n) };
  }
  return { beyondLimit: true };
}

/**
 * S7b-04: true when the child made no progress in the check-in weeks that count for the forecast (at least 2, the
 * adjusted ones left out). The briefing says "no recent progress" for it; `forecastOutcome` gives no date for it.
 */
export function noRecentProgress(plan: ChildPlan, calendar: FamilyCalendar): boolean {
  const checkIns = plan.checkInWeeks.map((weekStart) => ({ assignmentId: plan.assignmentId, childId: plan.childId, weekStart, position: 0, mode: null }));
  const seen = observedPace(plan, checkIns, calendar);
  return seen !== null && seen.pace <= EPS;
}

/**
 * How heavy `weekStart`'s week is for a child (S4-08): its load (summed thickness over every given plan) against the
 * child's average week, taken over the weeks that have any planned work (this one included). `ratio` is 0 when there
 * is no work to compare (never a division by zero). Heavy means `ratio >= HEAVY_WEEK_RATIO`.
 */
export function heavyWeek(childPlans: ChildPlan[], weekStart: LocalDate, calendar: FamilyCalendar): { load: number; average: number; ratio: number } {
  const w0 = weekStartOfDayNumber(toDayNumber(weekStart), calendar.weekStart);
  const weeks = new Map<number, number>();
  for (const p of childPlans) {
    for (const d of p.days) {
      const w = weekStartOfDayNumber(toDayNumber(d.date), calendar.weekStart);
      weeks.set(w, (weeks.get(w) ?? 0) + d.thickness);
    }
  }
  const load = weeks.get(w0) ?? 0;
  const worked = [...weeks.values()].filter((v) => v > EPS);
  const average = worked.length === 0 ? 0 : worked.reduce((s, v) => s + v, 0) / worked.length;
  return { load, average, ratio: average > EPS ? load / average : 0 };
}
