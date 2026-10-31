/**
 * Year-shape helpers for calendar templates (S5-03): US school holidays and "N weeks on, M weeks off" breaks.
 * Pure, on day numbers and local date strings only (no Date objects), like `dates.ts`.
 */
import { civilFromDays, daysFromCivil, EngineInputError, fromDayNumber, toDayNumber, weekdayOfDayNumber, weekStartOfDayNumber } from "./dates";
import type { LocalDate, WeekStart } from "./types";

export const HOLIDAY_KEYS = ["labor-day", "thanksgiving", "winter-break", "mlk-day", "presidents-day", "good-friday", "memorial-day"] as const;
export type HolidayKey = (typeof HOLIDAY_KEYS)[number];

export interface Holiday {
  /** Stable, so a screen can offer a checkbox per holiday. */
  key: HolidayKey;
  start: LocalDate;
  end: LocalDate;
  label: string;
}

/** A run of days off (a break week, S5-03). */
export interface BreakRange {
  start: LocalDate;
  end: LocalDate;
}

/** The nth (1-based) `weekday` (0 = Sunday) of month `m` in year `y`, as a day number. */
function nthWeekday(y: number, m: number, weekday: number, n: number): number {
  const first = daysFromCivil(y, m, 1);
  return first + ((weekday - weekdayOfDayNumber(first) + 7) % 7) + 7 * (n - 1);
}

/** The last `weekday` of month `m` in year `y`, as a day number. */
function lastWeekday(y: number, m: number, weekday: number): number {
  const next = m === 12 ? daysFromCivil(y + 1, 1, 1) : daysFromCivil(y, m + 1, 1);
  const last = next - 1;
  return last - ((weekdayOfDayNumber(last) - weekday + 7) % 7);
}

/** Easter Sunday of year `y` (Gregorian, the anonymous algorithm), as a day number. */
function easter(y: number): number {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return daysFromCivil(y, month, day);
}

/** The year's holidays as day-number ranges, in date order. */
function holidaysOfYear(y: number): { key: HolidayKey; label: string; start: number; end: number }[] {
  const thanksgiving = nthWeekday(y, 11, 4, 4);
  return [
    { key: "mlk-day", label: "Martin Luther King Jr. Day", start: nthWeekday(y, 1, 1, 3), end: nthWeekday(y, 1, 1, 3) },
    { key: "presidents-day", label: "Presidents' Day", start: nthWeekday(y, 2, 1, 3), end: nthWeekday(y, 2, 1, 3) },
    { key: "good-friday", label: "Good Friday", start: easter(y) - 2, end: easter(y) - 2 },
    { key: "memorial-day", label: "Memorial Day", start: lastWeekday(y, 5, 1), end: lastWeekday(y, 5, 1) },
    { key: "labor-day", label: "Labor Day", start: nthWeekday(y, 9, 1, 1), end: nthWeekday(y, 9, 1, 1) },
    { key: "thanksgiving", label: "Thanksgiving", start: thanksgiving, end: thanksgiving + 1 },
    { key: "winter-break", label: "Winter break", start: daysFromCivil(y, 12, 24), end: daysFromCivil(y + 1, 1, 1) },
  ];
}

/**
 * US school holidays that touch [start, end]: Labor Day, Thanksgiving (Thursday and Friday), winter break
 * (Dec 24 to Jan 1), Martin Luther King Jr. Day, Presidents' Day, Good Friday and Memorial Day. A holiday that
 * runs past either end of the range is cut to it. In date order.
 */
export function usHolidays(start: LocalDate, end: LocalDate): Holiday[] {
  const from = toDayNumber(start);
  const to = toDayNumber(end);
  const out: Holiday[] = [];
  // Winter break starts in the year before the one it ends in, so look one year back.
  for (let y = civilFromDays(from)[0] - 1; y <= civilFromDays(to)[0]; y += 1) {
    for (const h of holidaysOfYear(y)) {
      if (h.end < from || h.start > to) continue;
      out.push({ key: h.key, label: h.label, start: fromDayNumber(Math.max(h.start, from)), end: fromDayNumber(Math.min(h.end, to)) });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key));
}

/**
 * The break weeks of an "N weeks on, M weeks off" year (S5-03). From the first week start on or after `start`,
 * `weeksOn` school weeks then `weeksOff` break weeks repeat until `end`. Each run of break weeks is one range
 * of whole weeks (first day of the first to last day of the last), cut at `end`. `weeksOff` 0 gives none.
 */
export function onOffBreaks(start: LocalDate, end: LocalDate, weeksOn: number, weeksOff: number, weekStart: WeekStart): BreakRange[] {
  if (!Number.isInteger(weeksOn) || weeksOn < 1) throw new EngineInputError(`weeksOn must be a whole number of 1 or more, got ${weeksOn}`);
  if (!Number.isInteger(weeksOff) || weeksOff < 0) throw new EngineInputError(`weeksOff must be a whole number of 0 or more, got ${weeksOff}`);
  const from = toDayNumber(start);
  const to = toDayNumber(end);
  if (weeksOff === 0) return [];
  let week = weekStartOfDayNumber(from, weekStart);
  if (week < from) week += 7;
  const out: BreakRange[] = [];
  for (;;) {
    const breakStart = week + 7 * weeksOn;
    if (breakStart > to) break;
    out.push({ start: fromDayNumber(breakStart), end: fromDayNumber(Math.min(breakStart + 7 * weeksOff - 1, to)) });
    week = breakStart + 7 * weeksOff;
  }
  return out;
}

/** A built-in year shape (S5-03). `pattern` null = no pattern breaks, holidays only. */
export interface CalendarShape {
  id: "36-weeks" | "sabbath" | "three-terms";
  label: string;
  pattern: { weeksOn: number; weeksOff: number } | null;
}

export const CALENDAR_SHAPES: readonly CalendarShape[] = [
  { id: "36-weeks", label: "36 weeks", pattern: null },
  { id: "sabbath", label: "Sabbath schedule (6 on, 1 off)", pattern: { weeksOn: 6, weeksOff: 1 } },
  { id: "three-terms", label: "Three terms (12 on, 2 off)", pattern: { weeksOn: 12, weeksOff: 2 } },
];
