/**
 * S20-01: a minutes assignment is a daily amount (piano is 30 minutes a day), not a pile of minutes to finish.
 * The stored total is that daily amount times the school days in the dates. Moving the dates keeps the daily
 * amount by storing a new total. A day off does not add those minutes to the other days; the plan places the
 * daily amount on the days that remain (see plan.ts).
 */
import { isValidLocalDate, toDayNumber, weekdayOfDayNumber } from "./dates";
import type { LocalDate } from "./types";

/** Two decimal places, matching assignment.total_units. */
export function roundUnits(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** School days from `start` to `end`, both included, whose weekday is in `weekdays`. 0 when the dates are not a range. */
export function countWeekdays(start: LocalDate, end: LocalDate, weekdays: readonly number[]): number {
  if (!isValidLocalDate(start) || !isValidLocalDate(end)) return 0;
  const a = toDayNumber(start);
  const b = toDayNumber(end);
  if (b < a) return 0;
  const set = new Set(weekdays);
  let n = 0;
  for (let d = a; d <= b; d += 1) if (set.has(weekdayOfDayNumber(d))) n += 1;
  return n;
}

/**
 * The total that keeps the same units per school day when the span changes.
 * `oldDays` or `newDays` of 0 leaves the total alone (there is no pace to keep).
 */
export function totalForSameDaily(total: number, oldDays: number, newDays: number): number {
  if (!(oldDays > 0) || !(newDays > 0) || !Number.isFinite(total)) return total;
  return roundUnits((total / oldDays) * newDays);
}
