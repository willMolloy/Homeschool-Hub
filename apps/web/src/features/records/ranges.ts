/**
 * S9-08: the date ranges Records offers: This week, the school year, Fall and Spring (as the family named and dated them, S9-06),
 * its own terms, and custom dates (picked in the page). Pure.
 */
import { addDays, weekStartOf, type WeekStart } from "@hh/engine";
import type { Assignment, ZoomViews } from "../../api/types";

export interface RangeOption { key: string; label: string; start: string; end: string }

export interface RangeInput { views: ZoomViews; assignments: readonly Assignment[]; today: string; weekStart: WeekStart }

/** The first and last day of the live assignments, else the calendar year holding today. */
export function yearSpan(assignments: readonly Assignment[], today: string): { start: string; end: string } {
  const live = assignments.filter((a) => !a.archived);
  if (live.length === 0) return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
  return { start: live.reduce((x, a) => (a.startDate < x ? a.startDate : x), live[0]!.startDate), end: live.reduce((x, a) => (a.endDate > x ? a.endDate : x), live[0]!.endDate) };
}

export function rangeOptions({ views, assignments, today, weekStart }: RangeInput): RangeOption[] {
  const thisWeek = weekStartOf(today, weekStart);
  const year = yearSpan(assignments, today);
  const out: RangeOption[] = [
    { key: "week", label: "This week", start: thisWeek, end: addDays(thisWeek, 6) },
    { key: "year", label: "Year", start: year.start, end: year.end },
  ];
  // Fall and Spring: the halves either side of New Year when the year spans it; a family's own name and dates win.
  const newYear = `${Number(year.start.slice(0, 4)) + 1}-01-01`;
  const spans = year.end >= newYear;
  const halves = { fall: { name: "Fall", start: year.start, end: `${year.start.slice(0, 4)}-12-31` }, spring: { name: "Spring", start: newYear, end: year.end } };
  for (const z of ["fall", "spring"] as const) {
    if (views.hidden.includes(z)) continue;
    const o = views.overrides?.[z];
    const h = o ?? (spans ? halves[z] : null);
    if (h) out.push({ key: z, label: h.name, start: h.start, end: h.end });
  }
  for (const v of views.custom) out.push({ key: `custom:${v.id}`, label: v.name, start: v.start, end: v.end });
  return out;
}
