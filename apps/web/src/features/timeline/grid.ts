/**
 * T-02: the timeline's daily grid. Every zoom level draws from the same one-entry-per-calendar-day grid,
 * so daily and weekly views always line up (the Tools Page, "View model").
 */
import { addDays, dateRange, diffDays, weekStartOf, weekdayOf, type LocalDate, type WeekStart } from "@hh/engine";

export interface DayGrid {
  /** First and last calendar day, inclusive. */
  from: LocalDate;
  to: LocalDate;
  dates: LocalDate[];
  /** One per date: a weekday the family schools on (before breaks). */
  schoolDay: boolean[];
}

/** Widen [from, to] to whole weeks, so a weekly average never covers half a week. Fetch plans for this range. */
export function weekAlignedRange(from: LocalDate, to: LocalDate, weekStart: WeekStart): { from: LocalDate; to: LocalDate } {
  const start = weekStartOf(from, weekStart);
  return { from: start, to: addDays(weekStartOf(to, weekStart), 6) };
}

export function buildDayGrid(from: LocalDate, to: LocalDate, schoolDays: readonly number[]): DayGrid {
  const dates = diffDays(from, to) >= 0 ? dateRange(from, to) : [];
  const school = new Set(schoolDays);
  return { from, to, dates, schoolDay: dates.map((d) => school.has(weekdayOf(d))) };
}

/** Index of `date` on the grid, or -1 when it falls outside. */
export function gridIndex(grid: DayGrid, date: LocalDate): number {
  if (grid.dates.length === 0) return -1;
  const i = diffDays(grid.from, date);
  return i >= 0 && i < grid.dates.length ? i : -1;
}

/** [first, last] grid indices of an inclusive date span clipped to the grid, or null when it misses it entirely. */
export function clipSpan(grid: DayGrid, start: LocalDate, end: LocalDate): [number, number] | null {
  if (grid.dates.length === 0 || diffDays(start, end) < 0) return null;
  const first = Math.max(0, diffDays(grid.from, start));
  const last = Math.min(grid.dates.length - 1, diffDays(grid.from, end));
  return first <= last ? [first, last] : null;
}

/** A zero series the length of the grid. */
export const zeros = (grid: DayGrid): number[] => new Array<number>(grid.dates.length).fill(0);

/** Element-wise sum of equal-length series. */
export function sumSeries(series: readonly (readonly number[])[], length: number): number[] {
  const out = new Array<number>(length).fill(0);
  for (const s of series) for (let i = 0; i < length; i++) out[i]! += s[i] ?? 0;
  return out;
}
