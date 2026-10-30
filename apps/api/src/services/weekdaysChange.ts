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

const same = (a: number[] | null, b: number[] | null) => (a ? [...a].sort().join() : "") === (b ? [...b].sort().join() : "");

/**
 * What to store when an assignment's effective days go from `before` to `after`, or null to leave the history alone:
 * nothing changed, or the assignment hasn't started before the current week (so the new days simply apply, as in S4-01).
 */
export function weekdaysChange(i: { startDate: string; today: string; weekStart: WeekStart; before: number[] | null; after: number[] | null }): WeekdaysChange | null {
  if (same(i.before, i.after)) return null;
  const thisWeek = weekStartOfDayNumber(toDayNumber(i.today), i.weekStart);
  if (toDayNumber(i.startDate) >= thisWeek) return null;
  return { weekdaysFrom: fromDayNumber(thisWeek), previousWeekdays: i.before };
}
