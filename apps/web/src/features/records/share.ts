/**
 * S9b-01: the part of a log entry inside a range. Pure; mirrors apps/api services/recordTotals.ts (shareInRange).
 * An entry that overlaps the range counts only its covered days inside it, and its typed hours in proportion to those days
 * (one entry over 5 days with 10 h, 2 days inside: 4 h). A run covering no school days is split by calendar days instead.
 */
import { toDayNumber } from "@hh/engine";
import type { RecordEntry } from "../../api/types";

/** An entry as it counts in a range; `whole` is the full entry when only part of it is inside. */
export type EntryPart = RecordEntry & { whole?: RecordEntry };

export const overlaps = (e: Pick<RecordEntry, "startDate" | "endDate">, start: string, end: string): boolean => e.endDate >= start && e.startDate <= end;

const scaled = (m: number, f: number): number => (f === 1 ? m : Math.round(m * f));
const scaledOrNull = (m: number | null, f: number): number | null => (m === null ? null : scaled(m, f));

/** The entry clipped to the range (dates, covered and ticked days, school days and hours), or null when none of it is inside. */
export function partInRange(e: RecordEntry, start: string, end: string): EntryPart | null {
  if (!overlaps(e, start, end)) return null;
  const from = start > e.startDate ? start : e.startDate;
  const to = end < e.endDate ? end : e.endDate;
  if (from === e.startDate && to === e.endDate) return e;
  const days = e.coveredDays.filter((d) => d >= from && d <= to);
  const f = e.coveredDays.length > 0
    ? days.length / e.coveredDays.length
    : (toDayNumber(to) - toDayNumber(from) + 1) / (toDayNumber(e.endDate) - toDayNumber(e.startDate) + 1);
  return {
    ...e,
    startDate: from,
    endDate: to,
    coveredDays: days,
    // S10-10b (L4): the ticked days inside the range too, so a clipped row names its own days ("1 school day, Tue")
    days: e.days ? e.days.filter((d) => d >= from && d <= to) : null,
    schoolDays: e.countsSchoolDay ? days.length : 0,
    subjectMinutes: Object.fromEntries(Object.entries(e.subjectMinutes).map(([id, m]) => [id, scaled(m, f)])),
    totalMinutes: scaledOrNull(e.totalMinutes, f),
    homeMinutes: scaledOrNull(e.homeMinutes, f),
    awayMinutes: scaledOrNull(e.awayMinutes, f),
    whole: e,
  };
}

/** The distinct days the counted entries cover: a day logged twice, or by two children, is one day. */
export function distinctSchoolDays(entries: readonly RecordEntry[]): number {
  const days = new Set<string>();
  for (const e of entries) if (e.countsSchoolDay) for (const d of e.coveredDays) days.add(d);
  return days.size;
}
