/**
 * The history a weekday change leaves on a started assignment (S4-01b). Only one level is kept: the date the new days
 * apply from (the start of the family's current week) and the effective days before the change. The engine keeps the plan
 * before that date; earlier weeks are assumed done anyway.
 * S7-11: days are compared as they take effect, with "every school day" (null) read as the family's school days.
 */
import { fromDayNumber, toDayNumber, weekStartOfDayNumber, type WeekStart } from "@hh/engine";

export interface WeekdaysChange {
  /** null (with `previousWeekdays` null) clears the history: the change was undone (S4b-02). */
  weekdaysFrom: string | null;
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
 * S4b-02: when `stored` already starts at this week, an earlier change this week keeps its `previousWeekdays` (the days
 * the past was planned on), and a change back to those days clears the history.
 */
export function weekdaysChange(i: { startDate: string; today: string; weekStart: WeekStart; before: number[] | null; after: number[] | null; schoolDays?: readonly number[]; stored?: { weekdaysFrom: string | null; previousWeekdays: number[] | null } }): WeekdaysChange | null {
  // S7-11: null → the family's school days (when known), so "follow" and an explicit list of the same days are one thing.
  const resolved = (d: number[] | null) => d ?? (i.schoolDays ? [...i.schoolDays] : null);
  if (sameWeekdays(resolved(i.before), resolved(i.after))) return null;
  const weekdaysFrom = currentWeekStart(i.today, i.weekStart);
  if (i.startDate >= weekdaysFrom) return null;
  if (i.stored?.weekdaysFrom === weekdaysFrom) {
    if (sameWeekdays(resolved(i.after), resolved(i.stored.previousWeekdays))) return { weekdaysFrom: null, previousWeekdays: null };
    return { weekdaysFrom, previousWeekdays: i.stored.previousWeekdays };
  }
  return { weekdaysFrom, previousWeekdays: i.before };
}
