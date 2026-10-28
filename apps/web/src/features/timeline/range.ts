/**
 * T-04: which days the Year view covers. Pure.
 *
 * The family has no school-year setting yet, so the year is the Aug 1 – Jun 30 window that contains today
 * (July already counts as the coming year). The plan is fetched for that window, then the view is trimmed to the
 * days anything is actually planned, plus today, so empty summer weeks don't eat horizontal room.
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

/**
 * The range the view shows: from the first to the last planned day (inside the fetched range), widened to today,
 * week-aligned. With nothing planned it is the whole fetched range.
 */
export function shownRange(fetched: DateRange, plans: readonly ChildPlan[], today: LocalDate, weekStart: WeekStart): DateRange {
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
