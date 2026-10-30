/**
 * The history a weekday change leaves on a started assignment (S4-01b). Only one level is kept: the date the new days
 * apply from (the start of the family's current week) and the effective days before the change. The engine keeps the plan
 * before that date; earlier weeks are assumed done anyway.
 */
import { fromDayNumber, toDayNumber, weekStartOfDayNumber, type WeekStart } from "@hh/engine";

export interface WeekdaysChange {
  weekdaysFrom: string;
  /** null = every school day. */
  previousWeekdays: number[] | null;
}

/** An assignment's effective days: its own, else its subject's default, else null (every school day). */
export const effectiveWeekdays = (own: number[] | null, subjectDefault: number[] | null): number[] | null => own ?? subjectDefault ?? null;

export const sameWeekdays = (a: number[] | null, b: number[] | null) => (a ? [...a].sort().join() : "") === (b ? [...b].sort().join() : "");

/** The first day of the week `today` falls in (the date a weekday change applies from). */
export const currentWeekStart = (today: string, weekStart: WeekStart): string => fromDayNumber(weekStartOfDayNumber(toDayNumber(today), weekStart));

/**
 * What to store when an assignment's effective days go from `before` to `after`, or null to leave the history alone:
 * nothing changed, or the assignment hasn't started before the current week (so the new days simply apply, as in S4-01).
 */
export function weekdaysChange(i: { startDate: string; today: string; weekStart: WeekStart; before: number[] | null; after: number[] | null }): WeekdaysChange | null {
  if (sameWeekdays(i.before, i.after)) return null;
  const weekdaysFrom = currentWeekStart(i.today, i.weekStart);
  if (i.startDate >= weekdaysFrom) return null;
  return { weekdaysFrom, previousWeekdays: i.before };
}
