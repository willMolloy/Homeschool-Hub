/**
 * S7b-10: how many full days of work an assignment really has for a child. The plan spreads an assignment over the
 * capacity between its dates (`baseCap` in placement.ts): school days on the assignment's own days (its list, else its
 * subject's), minus days off, with an event that skips a subject's day counting 0 and a lighter one counting less. The
 * form's "About N pages a day" and the minutes a parent picks must use the same count, or 30 minutes a day is really 50.
 */
import { buildCapacityModel } from "./capacity";
import { toDayNumber, weekdayOfDayNumber } from "./dates";
import type { BlockedPeriod, FamilyCalendar, LocalDate, PlanContext, RecurringEvent, Weekday } from "./types";
import { weekdaysOf } from "./weekdays";

export interface CapacityDaysInput {
  calendar: FamilyCalendar;
  events?: RecurringEvent[];
  blocked?: BlockedPeriod[];
  subjectWeekdays?: PlanContext["subjectWeekdays"];
  /** null/undefined: no subject (events apply by their default rule only). */
  subjectId?: string | null;
  childId: string;
  start: LocalDate;
  end: LocalDate;
  /** The assignment's own days; null/undefined follows its subject's, else every school day. */
  weekdays?: Weekday[] | null;
}

/** The full days of capacity from `start` to `end` (both included) for the child; 0 when the dates aren't a range. */
export function capacityDays(input: CapacityDaysInput): number {
  const s = toDayNumber(input.start);
  const e = toDayNumber(input.end);
  if (e < s) return 0;
  const subjectId = input.subjectId ?? "";
  const { weekdays } = weekdaysOf({ subjectId, weekdays: input.weekdays ?? undefined }, { subjectWeekdays: input.subjectWeekdays });
  const mask = weekdays ? new Set<number>(weekdays) : null;
  const model = buildCapacityModel(input.calendar, input.events, input.blocked);
  let total = 0;
  for (let d = s; d <= e; d += 1) {
    if (mask && !mask.has(weekdayOfDayNumber(d))) continue;
    total += model.capacity(d, input.childId, subjectId);
  }
  return total;
}
