/**
 * S9b-07: which days of a run of dates count as school days. The server pre-selects from the school calendar
 * (GET /api/log-entries/run-days); the parent can tick or untick days. Short runs show one chip per date, long runs one
 * chip per weekday (days off are left out). Pure; dates are `YYYY-MM-DD` strings.
 */
import { addDays, diffDays, weekdayOf, type Weekday } from "@hh/engine";
import { MONTH_NAMES } from "../../lib/dates";

/** What the server says about a run: the family's school weekdays, the calendar's school days, and its days off. */
export interface RunDays {
  weekdays: number[];
  schoolDays: string[];
  daysOff: string[];
}

/** Runs up to two weeks get a chip per date; longer runs get a chip per weekday. */
export const DATE_CHIP_LIMIT = 14;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const WEEKDAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"] as const;
/** Monday first, the way a school week reads. */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export type ChipMode = "dates" | "weekdays";

export function datesBetween(start: string, end: string): string[] {
  const n = diffDays(start, end);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

export function chipMode(start: string, end: string): ChipMode {
  return diffDays(start, end) + 1 <= DATE_CHIP_LIMIT ? "dates" : "weekdays";
}

/** "Mon 2" (visible chip) */
export function dateChipLabel(d: string): string {
  return `${WEEKDAY_SHORT[weekdayOf(d)]} ${Number(d.slice(8, 10))}`;
}

/**
 * "Mon 2, Monday, November 2": a date chip's accessible name. It starts with the chip's visible text (WCAG 2.5.3 Label in
 * Name, S10-10b M1), so "click Mon 2" works by voice, then says the day and month in full.
 */
export function dateChipName(d: string): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${dateChipLabel(d)}, ${names[weekdayOf(d)]}, ${MONTH_NAMES[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
}

/**
 * S10-10b (M2): the parent's choices for a run, date by date (true ticked, false unticked). They outlive a change of dates:
 * a date still in the run keeps its tick, and only dates without a choice are pre-selected from the school calendar.
 */
export type DayTicks = ReadonlyMap<string, boolean>;

/** An entry's choices: every date of its run, ticked when it is one of the days the entry counts. */
export function ticksFrom(start: string, end: string, days: readonly string[]): Map<string, boolean> {
  const on = new Set(days);
  return new Map(datesBetween(start, end).map((d) => [d, on.has(d)]));
}

/** The dates that count: the parent's choice where there is one, else the calendar's (null while that is unknown). */
export function tickedDays(dates: readonly string[], ticks: DayTicks, schoolDays: ReadonlySet<string> | undefined): string[] | null {
  const out: string[] = [];
  for (const d of dates) {
    const t = ticks.get(d) ?? schoolDays?.has(d);
    if (t === undefined) return null;
    if (t) out.push(d);
  }
  return out;
}

/** The run's dates on a ticked weekday, without the days off. */
export function daysFromWeekdays(start: string, end: string, weekdays: Iterable<number>, daysOff: Iterable<string>): string[] {
  const want = new Set(weekdays);
  const off = new Set(daysOff);
  return datesBetween(start, end).filter((d) => want.has(weekdayOf(d)) && !off.has(d));
}

export function weekdaysOf(dates: Iterable<string>): Set<number> {
  return new Set([...dates].map((d) => weekdayOf(d)));
}

/** "Mon–Sat", "Mon, Wed, Fri", "Mon–Wed, Fri": weekdays Monday first, three or more in a row joined with "–". */
export function weekdayWords(days: Iterable<number>): string {
  const set = new Set(days);
  const order = WEEK_ORDER.filter((w) => set.has(w));
  const idx = order.map((w) => WEEK_ORDER.indexOf(w));
  const out: string[] = [];
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && idx[j + 1] === idx[j]! + 1) j++;
    if (j - i >= 2) out.push(`${WEEKDAY_SHORT[order[i]!]}–${WEEKDAY_SHORT[order[j]!]}`);
    else for (let k = i; k <= j; k++) out.push(WEEKDAY_SHORT[order[k]!]);
    i = j + 1;
  }
  return out.join(", ");
}

/** "Mon–Sat, 6 days" for the form; "No days ticked" when empty. */
export function daysSummary(dates: string[]): string {
  if (dates.length === 0) return "No days ticked";
  return `${weekdayWords(weekdaysOf(dates))}, ${dates.length} ${dates.length === 1 ? "day" : "days"}`;
}

/** The query for GET /api/log-entries/run-days. */
export function runDaysPath(start: string, end: string, childIds: string[]): string {
  const q = new URLSearchParams({ from: start, to: end });
  if (childIds.length > 0) q.set("childIds", childIds.join(","));
  return `/api/log-entries/run-days?${q.toString()}`;
}

export const NO_DAYS_TICKED = 'Tick at least one day, or turn off "Count as a school day".';
