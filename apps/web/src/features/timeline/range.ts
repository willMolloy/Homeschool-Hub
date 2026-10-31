/**
 * T-04: which days the Year view covers. Pure.
 *
 * The family has no school-year setting yet, so the year is the Aug 1 – Jun 30 window that contains today
 * (July already counts as the coming year). The plan is fetched for that window, then the view is trimmed to the
 * days anything is actually planned, plus today, so empty summer weeks don't eat horizontal room.
 * S6b-09: with no assignments at all the view still shows a calendar: this month and the next 10.
 */
import type { ChildPlan, LocalDate, WeekStart } from "@hh/engine";
import { weekAlignedRange } from "./grid";

export interface DateRange {
  from: LocalDate;
  to: LocalDate;
}

/** The Aug 1 – Jun 30 school year that contains `today`. */
export function schoolYearOf(today: LocalDate): DateRange {
  const year = Number(today.slice(0, 4));
  const start = Number(today.slice(5, 7)) >= 7 ? year : year - 1;
  return { from: `${start}-08-01`, to: `${start + 1}-06-30` };
}

/** The range to fetch the plan for: the school year, week-aligned. */
export function fetchRange(today: LocalDate, weekStart: WeekStart): DateRange {
  const sy = schoolYearOf(today);
  return weekAlignedRange(sy.from, sy.to, weekStart);
}

/** Months shown after the current one when nothing is planned (S6b-09). */
export const EMPTY_CALENDAR_MONTHS_AFTER = 10;

/** S6b-09: the start of today's month through the end of the month `EMPTY_CALENDAR_MONTHS_AFTER` later, week-aligned. */
export function emptyCalendarRange(today: LocalDate, weekStart: WeekStart): DateRange {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const last = new Date(Date.UTC(year, month - 1 + EMPTY_CALENDAR_MONTHS_AFTER + 1, 0));
  const to = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}-${String(last.getUTCDate()).padStart(2, "0")}` as LocalDate;
  return weekAlignedRange(`${today.slice(0, 7)}-01` as LocalDate, to, weekStart);
}

/**
 * The range the view shows: from the first to the last planned day (inside the fetched range), widened to today,
 * week-aligned. With days planned nowhere it is the whole fetched range; with no plans at all, the empty calendar (S6b-09).
 */
export function shownRange(fetched: DateRange, plans: readonly ChildPlan[], today: LocalDate, weekStart: WeekStart): DateRange {
  if (plans.length === 0) return emptyCalendarRange(today, weekStart);
  let first: LocalDate | null = null;
  let last: LocalDate | null = null;
  for (const p of plans) {
    for (const d of p.days) {
      if (d.thickness <= 0 || d.date < fetched.from || d.date > fetched.to) continue;
      if (first === null || d.date < first) first = d.date;
      if (last === null || d.date > last) last = d.date;
    }
  }
  if (first === null || last === null) return fetched;
  if (today >= fetched.from && today <= fetched.to) {
    if (today < first) first = today;
    if (today > last) last = today;
  }
  return weekAlignedRange(first, last, weekStart);
}
