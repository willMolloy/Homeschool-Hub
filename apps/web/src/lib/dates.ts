/**
 * S9-04: one place that writes and reads dates for a parent, in US style ("Nov 1, 2026"). Pure, locale-free (so the same
 * in every test and time zone), and always from a `YYYY-MM-DD` string; no `Date` is built from a local clock.
 */
import { isValidLocalDate } from "@hh/engine";

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const parts = (d: string): [number, number, number] => [Number(d.slice(0, 4)), Number(d.slice(5, 7)), Number(d.slice(8, 10))];
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const iso = (y: number, m: number, d: number) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;

/** "Nov 1, 2026" */
export function formatDate(d: string): string {
  if (!isValidLocalDate(d)) return d;
  const [y, m, day] = parts(d);
  return `${MONTH_SHORT[m - 1]} ${day}, ${y}`;
}

/** "Nov 1" (where space is tight) */
export function formatShort(d: string): string {
  if (!isValidLocalDate(d)) return d;
  const [, m, day] = parts(d);
  return `${MONTH_SHORT[m - 1]} ${day}`;
}

/** "Sunday, Nov 1" */
export function formatWeekday(d: string): string {
  if (!isValidLocalDate(d)) return d;
  const [y, m, day] = parts(d);
  return `${WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]}, ${MONTH_SHORT[m - 1]} ${day}`;
}

/** "Oct 26 – Nov 1" (or "Nov 1" when both ends are the same day). */
export function formatSpan(start: string, end: string): string {
  return start === end ? formatShort(start) : `${formatShort(start)} – ${formatShort(end)}`;
}

/** "Aug 17 – Dec 18, 2026", or with both years when they differ. */
export function formatRangeYears(start: string, end: string): string {
  if (start === end) return formatDate(start);
  return start.slice(0, 4) === end.slice(0, 4) ? `${formatShort(start)} – ${formatDate(end)}` : `${formatDate(start)} – ${formatDate(end)}`;
}

/**
 * Reads what a parent typed: "Nov 1, 2026", "November 1 2026", "11/1/2026", "11-1-2026" or "2026-11-01" (a four-digit
 * year is required, so a half-typed date is never taken for a different one). Returns `YYYY-MM-DD`, or null.
 */
export function parseDateInput(text: string): string | null {
  const t = text.trim().replace(/\s+/g, " ");
  let y: number, m: number, d: number;
  let hit = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (hit) [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else if ((hit = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) [m, d, y] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else if ((hit = /^([A-Za-z]+)\.? (\d{1,2}),? (\d{4})$/.exec(t))) {
    const name = hit[1]!.toLowerCase();
    const idx = MONTH_NAMES.findIndex((n) => n.toLowerCase() === name || n.slice(0, 3).toLowerCase() === name || (name === "sept" && n === "September"));
    if (idx < 0) return null;
    [m, d, y] = [idx + 1, Number(hit[2]), Number(hit[3])];
  } else return null;
  const out = iso(y, m, d);
  return isValidLocalDate(out) ? out : null;
}

/** The 6-row month grid for the calendar: dates from the Sunday on or before the 1st, `null` outside the month. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(iso(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** The first of the month before or after `{year, month}`. */
export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + by;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
