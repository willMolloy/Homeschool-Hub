/** S9-07: words for a log entry. Pure. Hours are typed as hours and minutes and kept as whole minutes. */
import type { RecordEntry, Subject } from "../../api/types";
import { formatDate, formatShort } from "../../lib/dates";
import { weekdayWords, weekdaysOf } from "./runDays";

/** 210 -> "3 h 30 m", 120 -> "2 h", 45 -> "45 m". */
export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r} m` : r === 0 ? `${h} h` : `${h} h ${r} m`;
}

/** Typed hours and minutes boxes to whole minutes; blank boxes are "nothing typed" (null); null with a problem text when not numbers. */
export function toMinutes(hours: string, minutes: string): { value: number | null; problem: string | null } {
  if (hours.trim() === "" && minutes.trim() === "") return { value: null, problem: null };
  const h = hours.trim() === "" ? 0 : Number(hours);
  const m = minutes.trim() === "" ? 0 : Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0) return { value: null, problem: "Use whole hours and minutes." };
  if (m > 59) return { value: null, problem: "Minutes are 0 to 59." };
  return { value: h * 60 + m, problem: null };
}

/** The boxes for a stored amount. */
export const boxesFor = (m: number | null | undefined): { h: string; m: string } => (m == null ? { h: "", m: "" } : { h: String(Math.floor(m / 60)), m: String(m % 60) });

export const dayWords = (e: Pick<RecordEntry, "startDate" | "endDate">) =>
  e.startDate === e.endDate ? formatDate(e.startDate) : `${formatShort(e.startDate)} – ${formatDate(e.endDate)}`;

/** S9b-01: under an entry only partly in the range: "part of an entry from Nov 2 to Nov 6". */
export const partWords = (whole: Pick<RecordEntry, "startDate" | "endDate">) => `part of an entry from ${formatShort(whole.startDate)} to ${formatShort(whole.endDate)}`;

/** "5 school days · Math 3 h 30 m, Reading 2 h · 6 h at home". Only what was typed. */
export function summaryOf(e: RecordEntry, subjects: readonly Subject[]): string {
  const parts: string[] = [];
  // S9b-05 (N16): with the switch off the summary says so, rather than just leaving the days out.
  // S9b-07: when the parent ticked the days of a run, the summary names them ("6 school days, Mon–Sat").
  const ticked = e.countsSchoolDay && e.days && e.days.length > 0 ? `, ${weekdayWords(weekdaysOf(e.days))}` : "";
  parts.push(e.countsSchoolDay ? `${e.schoolDays} school ${e.schoolDays === 1 ? "day" : "days"}${ticked}` : "Not counted as a school day");
  const named = Object.entries(e.subjectMinutes).map(([id, m]) => `${subjects.find((s) => s.id === id)?.name ?? "A subject"} ${formatMinutes(m)}`);
  if (named.length) parts.push(named.join(", "));
  if (e.totalMinutes != null) parts.push(`${formatMinutes(e.totalMinutes)} in all`);
  if (e.homeMinutes != null) parts.push(`${formatMinutes(e.homeMinutes)} at home`);
  if (e.awayMinutes != null) parts.push(`${formatMinutes(e.awayMinutes)} away`);
  if (e.books.length) parts.push(`${e.books.length} ${e.books.length === 1 ? "book" : "books"}`);
  if (e.notes) parts.push(e.notes.length > 60 ? `${e.notes.slice(0, 59)}…` : e.notes);
  return parts.join(" · ");
}
