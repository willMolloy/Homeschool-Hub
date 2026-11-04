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

/**
 * S9b-05 (N13): the default Fall and Spring of the school year, the one source for Records and the Zoom views sheet:
 * Fall from the first day to Dec 31, Spring from Jan 1 to the last day. Null when the year does not span New Year.
 */
export function yearHalves(year: { start: string; end: string }): { fall: { start: string; end: string }; spring: { start: string; end: string } } | null {
  const newYear = `${Number(year.start.slice(0, 4)) + 1}-01-01`;
  if (year.end < newYear) return null;
  return { fall: { start: year.start, end: `${year.start.slice(0, 4)}-12-31` }, spring: { start: newYear, end: year.end } };
}

export function rangeOptions({ views, assignments, today, weekStart }: RangeInput): RangeOption[] {
  const thisWeek = weekStartOf(today, weekStart);
  const year = yearSpan(assignments, today);
  const out: RangeOption[] = [
    { key: "week", label: "This week", start: thisWeek, end: addDays(thisWeek, 6) },
    { key: "year", label: "Year", start: year.start, end: year.end },
  ];
  // Fall and Spring: the halves either side of New Year when the year spans it; a family's own name and dates win.
  const halves = yearHalves(year);
  const names = { fall: "Fall", spring: "Spring" };
  for (const z of ["fall", "spring"] as const) {
    if (views.hidden.includes(z)) continue;
    const o = views.overrides?.[z];
    const h = o ?? (halves ? { name: names[z], ...halves[z] } : null);
    if (h) out.push({ key: z, label: h.name, start: h.start, end: h.end });
  }
  for (const v of views.custom) out.push({ key: `custom:${v.id}`, label: v.name, start: v.start, end: v.end });
  return out;
}
