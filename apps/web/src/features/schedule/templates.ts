/** S5-05: the breaks a calendar template adds, worked out from the year's dates. Pure; dates are "YYYY-MM-DD" strings. */
import { HOLIDAY_KEYS, onOffBreaks, usHolidays, type HolidayKey, type WeekStart } from "@hh/engine";
import type { BlockedKind, BlockedRange } from "../../api/types";

export interface PlannedBreak {
  label: string;
  kind: Extract<BlockedKind, "holiday" | "vacation">;
  start: string;
  end: string;
}

/** The pattern breaks' label. */
export const BREAK_LABEL = "Break";

/** The longest school year a template is asked for, as for a plan request. */
export const MAX_YEAR_DAYS = 400;

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end;

/**
 * The year's breaks: the ticked holidays (kind holiday) and the pattern's break weeks (kind vacation), in date order.
 * A holiday that lies wholly inside a break week is left out, since the break already covers it.
 */
export function plannedBreaks(
  start: string, end: string, pattern: { weeksOn: number; weeksOff: number } | null, holidays: ReadonlySet<HolidayKey>, weekStart: WeekStart,
): PlannedBreak[] {
  const weeks = pattern ? onOffBreaks(start, end, pattern.weeksOn, pattern.weeksOff, weekStart) : [];
  const out: PlannedBreak[] = weeks.map((w) => ({ label: BREAK_LABEL, kind: "vacation", start: w.start, end: w.end }));
  for (const h of usHolidays(start, end)) {
    if (!holidays.has(h.key)) continue;
    if (weeks.some((w) => w.start <= h.start && h.end <= w.end)) continue;
    out.push({ label: h.label, kind: "holiday", start: h.start, end: h.end });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/**
 * Splits `planned` into what to add and how many are already covered: a break that shares a day with a day off
 * for the whole family is left out. (A day off for some children only doesn't cover a family-wide break.)
 */
export function leaveOutExisting(planned: PlannedBreak[], existing: BlockedRange[]): { add: PlannedBreak[]; skipped: number } {
  const familyWide = existing.filter((r) => r.childIds.length === 0).map((r) => ({ start: r.startDate, end: r.endDate }));
  const add = planned.filter((b) => !familyWide.some((r) => overlaps(b, r)));
  return { add, skipped: planned.length - add.length };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const md = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

/** "Nov 26–27", "Dec 24 – Jan 1", "Nov 4". No year: the preview is for one school year. */
export function breakDates(start: string, end: string): string {
  if (start === end) return md(start);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${md(start)}–${Number(end.slice(8, 10))}`;
  return `${md(start)} – ${md(end)}`;
}

export const breakText = (b: PlannedBreak) => `${b.label}: ${breakDates(b.start, b.end)}`;

/** Every holiday key, in the order a school year meets them. */
export const ALL_HOLIDAYS: ReadonlySet<HolidayKey> = new Set(HOLIDAY_KEYS);
