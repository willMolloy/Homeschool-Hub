/** S5-05: the breaks a calendar template adds, worked out from the year's dates. Pure; dates are "YYYY-MM-DD" strings. */
import { addDays, diffDays, HOLIDAY_KEYS, onOffBreaks, usHolidays, type HolidayKey, type WeekStart } from "@hh/engine";
import type { BlockedKind, BlockedRange, TemplateBreak } from "../../api/types";

export interface PlannedBreak {
  /** null = a day off with no label of its own (S5-07). */
  label: string | null;
  kind: BlockedKind;
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

/** "Thanksgiving: Nov 26–27"; a break with no label is named by its kind ("Sick day: Nov 4"). */
export const breakText = (b: PlannedBreak, kindLabels: Record<BlockedKind, string>) => `${b.label ?? kindLabels[b.kind]}: ${breakDates(b.start, b.end)}`;

/** S5-07: a saved template's breaks moved to a year that starts on `first` (shifted by days, not by weekday). */
export function shiftedBreaks(breaks: TemplateBreak[], first: string): PlannedBreak[] {
  return breaks
    .map((b) => ({ label: b.label, kind: b.kind, start: addDays(first, b.offsetDays), end: addDays(first, b.offsetDays + b.lengthDays - 1) }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/** The longest break a template stores (apps/api/src/routes/calendarTemplates.ts). */
export const MAX_TEMPLATE_LENGTH = 60;
/** The most breaks a template holds. */
export const MAX_TEMPLATE_BREAKS = 100;
/** A saved year covers the first day and the 365 days after it. */
export const TEMPLATE_YEAR_DAYS = 365;

/**
 * S5-07: what "Save as a template" stores for the year starting on `first`: every family-wide day off that starts
 * from that day to a year later, as offsets from `first` (kind and label kept, a break over 60 days cut to 60).
 * `leftOut` counts the days off in that year that are for some children only.
 */
export function templateBreaksFrom(existing: BlockedRange[], first: string): { breaks: TemplateBreak[]; leftOut: number } {
  const inYear = existing.filter((r) => {
    const offset = diffDays(first, r.startDate);
    return offset >= 0 && offset <= TEMPLATE_YEAR_DAYS;
  });
  const breaks = inYear
    .filter((r) => r.childIds.length === 0)
    .map((r) => ({
      offsetDays: diffDays(first, r.startDate),
      lengthDays: Math.min(diffDays(r.startDate, r.endDate) + 1, MAX_TEMPLATE_LENGTH),
      label: r.label,
      kind: r.kind,
    }))
    .sort((a, b) => a.offsetDays - b.offsetDays || a.lengthDays - b.lengthDays);
  return { breaks, leftOut: inYear.length - breaks.length };
}

/** Every holiday key, in the order a school year meets them. */
export const ALL_HOLIDAYS: ReadonlySet<HolidayKey> = new Set(HOLIDAY_KEYS);
