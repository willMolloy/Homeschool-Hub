/** S5-05: the breaks a calendar template adds, worked out from the year's dates. Pure; dates are "YYYY-MM-DD" strings. */
import { addDays, diffDays, HOLIDAY_KEYS, onOffBreaks, toDayNumber, usHolidays, weekdayOfDayNumber, type HolidayKey, type LocalDate, type WeekStart } from "@hh/engine";
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

import { MONTH_SHORT as MONTHS } from "../../lib/dates";
const md = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

/** "Nov 26–27", "Dec 24 – Jan 1", "Nov 4". No year: the preview is for one school year. */
export function breakDates(start: string, end: string): string {
  if (start === end) return md(start);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${md(start)}–${Number(end.slice(8, 10))}`;
  return `${md(start)} – ${md(end)}`;
}

/** "Thanksgiving: Nov 26–27"; a break with no label is named by its kind ("Sick day: Nov 4"). */
export const breakText = (b: PlannedBreak, kindLabels: Record<BlockedKind, string>) => `${b.label ?? kindLabels[b.kind]}: ${breakDates(b.start, b.end)}`;

/**
 * S5-07, S7b-13, S7b-17: a saved template's breaks moved to a year that starts on `first`.
 * - A break saved with a `holiday` is placed around that holiday's real dates in the new year (the one nearest where the
 *   break was): from `holidayBefore` days before it to `holidayAfter` days after it. A break that was exactly the holiday
 *   has neither (0 and 0) and lands on its dates. When it has days before, it starts on the weekday it started on (the
 *   Monday of Thanksgiving week) if that weekday was saved, never later than the holiday itself.
 * - Any other break is shifted by days. When it started on the family's week start (a Monday, say), it is moved to the
 *   nearest such day, so a week-long break stays Monday to Friday whatever the two years' first days are.
 * Templates saved before S7b-13 carry no key or weekday and are just shifted; before S7b-17, a holiday has no offsets.
 */
export function shiftedBreaks(breaks: TemplateBreak[], first: string, weekStart: WeekStart = "mon"): PlannedBreak[] {
  const startDay = weekStart === "sun" ? 0 : 1;
  const holidays = usHolidays(addDays(first, -14) as LocalDate, addDays(first, TEMPLATE_YEAR_DAYS + 14) as LocalDate);
  const onWeekday = (date: string, weekday: number) => {
    let d = (weekday - weekdayOfDayNumber(toDayNumber(date as LocalDate)) + 7) % 7;
    if (d > 3) d -= 7;
    return addDays(date, d);
  };
  return breaks
    .map((b): PlannedBreak => {
      const nominal = addDays(first, b.offsetDays);
      const before = b.holidayBefore ?? 0;
      const after = b.holidayAfter ?? 0;
      const h = b.holiday
        ? holidays.filter((x) => x.key === b.holiday).sort((x, y) => Math.abs(diffDays(nominal, addDays(x.start, -before))) - Math.abs(diffDays(nominal, addDays(y.start, -before))))[0]
        : undefined;
      if (h) {
        let start = addDays(h.start, -before);
        if (before > 0 && b.weekday !== undefined) {
          const aligned = onWeekday(start, b.weekday);
          start = aligned <= h.start ? aligned : start;
        }
        return { label: b.label ?? h.label, kind: b.kind, start, end: addDays(h.end, after) };
      }
      let start = nominal;
      if (b.weekday === startDay) start = onWeekday(nominal, startDay);
      return { label: b.label, kind: b.kind, start, end: addDays(start, b.lengthDays - 1) };
    })
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
 * `leftOut` counts the days off in that year that are for some children only. S7b-13: a break also keeps the weekday it started on, and the holiday it is when it is one. S7-08: `before` counts the family-wide
 * days off that start before `first` (not saved: a template holds offsets from the first day, never negative ones).
 */
export function templateBreaksFrom(existing: BlockedRange[], first: string): { breaks: TemplateBreak[]; leftOut: number; before: number } {
  const inYear = existing.filter((r) => {
    const offset = diffDays(first, r.startDate);
    return offset >= 0 && offset <= TEMPLATE_YEAR_DAYS;
  });
  const breaks = inYear
    .filter((r) => r.childIds.length === 0)
    .map((r): TemplateBreak => {
      // S7b-13, S7b-17: a day off that is a US holiday, or a break with a whole holiday inside it (a Thanksgiving week), is kept by
      // that holiday and the days before and after it, so it follows the holiday next year. Exactly the holiday: no offsets.
      const near = usHolidays(addDays(r.startDate, -14) as LocalDate, addDays(r.endDate, 14) as LocalDate);
      const holiday = near.find((h) => h.start === r.startDate && h.end === r.endDate)
        ?? near.filter((h) => h.start >= r.startDate && h.end <= r.endDate).sort((x, y) => diffDays(y.start, y.end) - diffDays(x.start, x.end))[0];
      const around = holiday && !(holiday.start === r.startDate && holiday.end === r.endDate)
        ? { holidayBefore: diffDays(r.startDate, holiday.start), holidayAfter: diffDays(holiday.end, r.endDate) } : {};
      return {
        offsetDays: diffDays(first, r.startDate),
        lengthDays: Math.min(diffDays(r.startDate, r.endDate) + 1, MAX_TEMPLATE_LENGTH),
        label: r.label,
        kind: r.kind,
        weekday: weekdayOfDayNumber(toDayNumber(r.startDate as LocalDate)),
        ...(holiday ? { holiday: holiday.key, ...around } : {}),
      };
    })
    .sort((a, b) => a.offsetDays - b.offsetDays || a.lengthDays - b.lengthDays);
  const before = existing.filter((r) => r.childIds.length === 0 && diffDays(first, r.startDate) < 0).length;
  return { breaks, leftOut: inYear.length - breaks.length, before };
}

/** Every holiday key, in the order a school year meets them. */
export const ALL_HOLIDAYS: ReadonlySet<HolidayKey> = new Set(HOLIDAY_KEYS);
