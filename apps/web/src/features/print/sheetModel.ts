/**
 * S13-02 / S13-03: what a printed sheet says, built from the engine's plans. Pure. Work only: subject, assignment, and the range
 * for each day ("Mon · pages 120–126"), from the same range rule as the Week bars (`plannedRangeBetween`). Days an assignment does
 * not run, days off and breaks are left out; a break reads once by its name. No minutes and no effort words: an assignment counted in
 * minutes shows its days with no range, because a time is what the sheets leave out (Will: "No minutes").
 */
import { addDays, EPS, type ChildPlan, type LocalDate } from "@hh/engine";
import type { BlockedRange, Child } from "../../api/types";
import { WEEKDAY_NAMES } from "../../lib/dates";
import { plannedRangeBetween, rangeWords, type Lookups } from "../week/weekBars";

export interface SheetRow { date: LocalDate; /** "Mon" */ day: string; /** "pages 120–126", or null for work counted in minutes. */ range: string | null }
export interface SheetAssignment { assignmentId: string; title: string; rows: SheetRow[] }
export interface SheetSubject { subjectId: string | null; name: string; slot: number; assignments: SheetAssignment[] }
export interface ChildSheet { childId: string; childName: string; subjects: SheetSubject[]; breaks: string[] }

export interface SheetLookups extends Lookups { slotOfAssignment: (assignmentId: string) => number }

const weekdayOf = (d: LocalDate): number => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))).getUTCDay();
/** "Mon" */
export const dayAbbr = (d: LocalDate): string => WEEKDAY_NAMES[weekdayOf(d)]!.slice(0, 3);
/** "Tuesday" */
export const dayName = (d: LocalDate): string => WEEKDAY_NAMES[weekdayOf(d)]!;

const BREAK_WORD: Record<string, string> = { vacation: "Break", holiday: "Holiday", sick: "Sick day", other: "Day off" };

/** Names of the breaks and days off that cover a school day between `from` and `to` for this child ("Thanksgiving break"), once each. */
export function breakNames(blocked: readonly BlockedRange[], childId: string, from: LocalDate, to: LocalDate, schoolDays: readonly number[]): string[] {
  const names: string[] = [];
  for (const b of blocked) {
    if (b.kind === "missed") continue; // a missed day carries its work forward; it is not a break
    if (b.childIds.length > 0 && !b.childIds.includes(childId)) continue;
    const covered: LocalDate[] = [];
    for (let d = from < b.startDate ? b.startDate : from; d <= to && d <= b.endDate; d = addDays(d, 1)) if (schoolDays.includes(weekdayOf(d))) covered.push(d);
    if (covered.length === 0) continue;
    const label = b.label?.trim() || BREAK_WORD[b.kind] || "Day off";
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
  for (const p of plans) {
    if (p.childId !== child.id) continue;
    const rows: SheetRow[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const day = p.days.find((x) => x.date === d);
      if (!day || day.units <= EPS || (p.endedOn && d > p.endedOn)) continue;
      const r = plannedRangeBetween(p, d, d);
      if (!r.hasPlannedWork) continue;
      rows.push({ date: d, day: dayAbbr(d), range: p.unitType === "minutes" ? null : rangeWords(p.unitType, r.from, r.to, p.totalUnits) });
    }
    if (rows.length === 0) continue;
    const sid = l.subjectOf(p.assignmentId);
    const key = sid ?? "";
    const subject = l.subjects.find((s) => s.id === sid);
    let group = bySubject.get(key);
    if (!group) bySubject.set(key, (group = { subjectId: sid, name: subject?.name ?? "Other", slot: l.slotOfAssignment(p.assignmentId), assignments: [] }));
    group.assignments.push({ assignmentId: p.assignmentId, title: l.titleOf(p.assignmentId), rows });
  }
  const rank = (id: string | null) => (id && subjectOrder.includes(id) ? subjectOrder.indexOf(id) : subjectOrder.length);
  const subjects = [...bySubject.values()].sort((a, b) => rank(a.subjectId) - rank(b.subjectId));
  for (const s of subjects) s.assignments.sort((a, b) => a.title.localeCompare(b.title));
  return { childId: child.id, childName: child.name, subjects, breaks: breakNames(blocked, child.id, from, to, schoolDays) };
}

/** True when nothing is scheduled. */
export const isEmpty = (s: ChildSheet): boolean => s.subjects.length === 0;
