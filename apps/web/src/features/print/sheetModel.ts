/**
 * S13-02 / S13-03: what a printed sheet says, built from the engine's plans. Pure. Work only: subject, assignment, and the range
 * for each day ("Mon · pages 120–126"), from the same range rule as the Week bars (`plannedRangeBetween`). Days an assignment does
 * not run, days off and breaks are left out; a break reads once by its name. No minutes and no effort words: an assignment counted in
 * minutes shows its days with no range, because a time is what the sheets leave out (Will: "No minutes").
 */
import { addDays, EPS, type ChildPlan, type LocalDate } from "@hh/engine";
import type { BlockedRange, Child } from "../../api/types";
import { WEEKDAY_NAMES } from "../../lib/dates";
import { dayOffTitle, KIND_NAMES } from "../../lib/kindNames";
import { daySpanLabels, plannedRangeBetween, rangeWords, type Lookups } from "../week/weekBars";

export interface SheetRow { date: LocalDate; /** "Mon" */ day: string; /** "pages 120–126", or null for work counted in minutes. */ range: string | null }
export interface SheetAssignment { assignmentId: string; title: string; rows: SheetRow[] }
export interface SheetSubject { subjectId: string | null; name: string; slot: number; assignments: SheetAssignment[] }
/** S19-05: one line of a day on the weekly sheet. */
export interface WeekLine { subject: string; slot: number; title: string; range: string | null }
/** S19-05: one school day of the weekly sheet, in week order. */
export interface WeekDay {
  date: LocalDate;
  /** "Monday" */
  name: string;
  lines: WeekLine[];
  /** "Wednesday · Thanksgiving break", or null when the day is not a break. */
  off: string | null;
}
export interface ChildSheet { childId: string; childName: string; subjects: SheetSubject[]; breaks: string[]; /** Set for a week (from < to). Empty for a single day. */ days: WeekDay[] }

export interface SheetLookups extends Lookups { slotOfAssignment: (assignmentId: string) => number }

const weekdayOf = (d: LocalDate): number => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))).getUTCDay();
/** "Mon" */
export const dayAbbr = (d: LocalDate): string => WEEKDAY_NAMES[weekdayOf(d)]!.slice(0, 3);
/** "Tuesday" */
export const dayName = (d: LocalDate): string => WEEKDAY_NAMES[weekdayOf(d)]!;

export const BREAK_WORD: Record<string, string> = KIND_NAMES;

/** Names of the breaks and days off that cover a school day between `from` and `to` for this child ("Thanksgiving break"), once each. */
export function breakNames(blocked: readonly BlockedRange[], childId: string, from: LocalDate, to: LocalDate, schoolDays: readonly number[]): string[] {
  const names: string[] = [];
  for (const b of blocked) {
    if (b.kind === "missed") continue; // a missed day carries its work forward; it is not a break
    if (b.childIds.length > 0 && !b.childIds.includes(childId)) continue;
    const covered: LocalDate[] = [];
    for (let d = from < b.startDate ? b.startDate : from; d <= to && d <= b.endDate; d = addDays(d, 1)) if (schoolDays.includes(weekdayOf(d))) covered.push(d);
    if (covered.length === 0) continue;
    const label = dayOffTitle(b);
    // S14-00 (N5): on a week's sheet, a day off for particular children names its day ("Wed · Dentist"); a whole-family break reads by its name.
    const first = dayAbbr(covered[0]!), last = dayAbbr(covered[covered.length - 1]!);
    const name = from < to && b.childIds.length > 0 ? `${first === last ? first : `${first}–${last}`} · ${label}` : label;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/** One child's sheet for `from`..`to` (a week, or one day when equal). `subjects` and `children` order the page. */
export function buildSheet(child: Child, plans: readonly ChildPlan[], from: LocalDate, to: LocalDate, l: SheetLookups, blocked: readonly BlockedRange[], schoolDays: readonly number[]): ChildSheet {
  const subjectOrder = [...l.subjects].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)).map((s) => s.id);
  const bySubject = new Map<string, SheetSubject>();
  const byDay = new Map<LocalDate, WeekLine[]>();
  for (const p of plans) {
    if (p.childId !== child.id) continue;
    const rows: SheetRow[] = [];
    const sid = l.subjectOf(p.assignmentId);
    const subject = l.subjects.find((s) => s.id === sid);
    // S16-11: a chapter or lesson's exact start / day N of M / finish, from the whole sequence of days the plan holds (it must hold days either side).
    const spanWords = daySpanLabels(p);
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const day = p.days.find((x) => x.date === d);
      if (!day || day.units <= EPS || (p.endedOn && d > p.endedOn)) continue;
      const r = plannedRangeBetween(p, d, d);
      if (!r.hasPlannedWork) continue;
      const range = p.unitType === "minutes" ? null : spanWords.get(d) ?? rangeWords(p.unitType, r.from, r.to, p.totalUnits);
      rows.push({ date: d, day: dayAbbr(d), range });
      const line: WeekLine = { subject: subject?.name ?? "Other", slot: l.slotOfAssignment(p.assignmentId), title: l.titleOf(p.assignmentId), range };
      byDay.set(d, [...(byDay.get(d) ?? []), line]);
    }
    if (rows.length === 0) continue;
    const key = sid ?? "";
    let group = bySubject.get(key);
    if (!group) bySubject.set(key, (group = { subjectId: sid, name: subject?.name ?? "Other", slot: l.slotOfAssignment(p.assignmentId), assignments: [] }));
    group.assignments.push({ assignmentId: p.assignmentId, title: l.titleOf(p.assignmentId), rows });
  }
  const rank = (id: string | null) => (id && subjectOrder.includes(id) ? subjectOrder.indexOf(id) : subjectOrder.length);
  const subjects = [...bySubject.values()].sort((a, b) => rank(a.subjectId) - rank(b.subjectId));
  for (const s of subjects) s.assignments.sort((a, b) => a.title.localeCompare(b.title));
  const subjectRank = new Map(subjectOrder.map((id, i) => [l.subjects.find((s) => s.id === id)?.name ?? "", i]));
  const days: WeekDay[] = [];
  // S19-05: a week is grouped by school day. A single day keeps the subject layout and leaves this empty.
  if (from < to) {
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (!schoolDays.includes(weekdayOf(d))) continue;
      const lines = (byDay.get(d) ?? []).slice().sort((a, b) => (subjectRank.get(a.subject) ?? subjectOrder.length) - (subjectRank.get(b.subject) ?? subjectOrder.length) || a.title.localeCompare(b.title));
      const names = breakNames(blocked, child.id, d, d, schoolDays);
      days.push({ date: d, name: dayName(d), lines, off: names.length > 0 ? `${dayName(d)} · ${names.join(", ")}` : null });
    }
  }
  return { childId: child.id, childName: child.name, subjects, breaks: breakNames(blocked, child.id, from, to, schoolDays), days };
}

/** True when nothing is scheduled. */
export const isEmpty = (s: ChildSheet): boolean => s.subjects.length === 0;
