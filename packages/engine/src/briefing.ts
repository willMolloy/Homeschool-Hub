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
 * The projected finish date at the pace the check-ins show (S4-08), or null: fewer than 2 check-in weeks for this
 * assignment and child, a pace that is on plan or ahead, no progress at all (the caller says "no recent progress"),
 * or nothing left. Never NaN or Infinity.
 *
 * - Observed pace: units gained from the start of the first check-in week to the end of the last one, per unit of
 *   capacity in that span (units per capacity-day, on the assignment's own days).
 * - Planned pace: the total over the capacity between the start and the planned end.
 * - The remaining units are then placed at the observed pace after the last check-in week, on the plan's capacity
 *   days, and past the plan's last day on the calendar's school days that are also the assignment's days.
 */
export function forecastFinish(plan: ChildPlan, checkIns: ProgressCheckIn[] | undefined, calendar: FamilyCalendar): LocalDate | null {
  const applied = new Set(plan.checkInWeeks);
  const weeks = new Set<string>();
  for (const ci of checkIns ?? []) {
    if (ci.assignmentId !== plan.assignmentId || ci.childId !== plan.childId) continue;
    const w0 = fromDayNumber(weekStartOfDayNumber(toDayNumber(ci.weekStart), calendar.weekStart));
    if (applied.has(w0)) weeks.add(w0);
  }
  if (weeks.size < 2 || plan.remainingUnits <= EPS || plan.days.length === 0) return null;

  const sorted = [...weeks].map(toDayNumber).sort((a, b) => a - b);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]! + 6;
  let before = 0;
  let atEnd = 0;
  let spanCapacity = 0;
  let plannedCapacity = 0;
  for (const d of plan.days) {
    const n = toDayNumber(d.date);
    if (n < first) before = d.position;
    if (n <= last) atEnd = d.position;
    if (n >= first && n <= last) spanCapacity += d.capacity;
    if (d.date <= plan.plannedEnd) plannedCapacity += d.capacity;
  }
  if (spanCapacity <= EPS || plannedCapacity <= EPS) return null;
  const observed = (atEnd - before) / spanCapacity;
  const planned = plan.totalUnits / plannedCapacity;
  if (!Number.isFinite(observed) || !Number.isFinite(planned) || observed <= EPS || observed >= planned - EPS) return null;

  const capacityOf = new Map(plan.days.map((d) => [toDayNumber(d.date), d.capacity] as const));
  const lastPlanDay = toDayNumber(plan.days[plan.days.length - 1]!.date);
  const ownDays = plan.weekdays ? new Set<number>(plan.weekdays) : null;
  const schoolDays = new Set<number>(calendar.schoolDays);
  let left = plan.remainingUnits;
  for (let n = last + 1; n <= last + 1 + MAX_PUSH_DAYS; n += 1) {
    const wd = weekdayOfDayNumber(n);
    const cap = n <= lastPlanDay ? capacityOf.get(n) ?? 0 : schoolDays.has(wd) && (!ownDays || ownDays.has(wd)) ? 1 : 0;
    left -= observed * cap;
    if (left <= EPS) return fromDayNumber(n);
  }
  return null;
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
