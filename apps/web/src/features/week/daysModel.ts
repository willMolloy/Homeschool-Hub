/**
 * S16-01: the Days layout of Schedule · Week. One column (or one block on a phone) per school day of the shown week, each a short list
 * of lines: subject, title and that day's range. The lines are NOT computed again here: they are read out of `buildSheet`, the model the
 * printed weekly sheet uses (S13-02), so the screen and the paper cannot disagree (S15-06's whole-unit ranges included). Pure.
 */
import { addDays, EPS, type ChildPlan, type LocalDate } from "@hh/engine";
import type { BlockedRange, Child } from "../../api/types";
import { formatShort } from "../../lib/dates";
import { buildSheet, dayAbbr, BREAK_WORD, type SheetLookups } from "../print/sheetModel";

export interface DayLine {
  key: string;
  childId: string;
  childName: string;
  assignmentId: string;
  title: string;
  subjectId: string | null;
  slot: number;
  /** "pages 120–126"; null for work counted in minutes (the title alone). */
  range: string | null;
}
export interface DayColumn {
  date: LocalDate;
  /** "Mon, Nov 2" */
  heading: string;
  lines: DayLine[];
  /** A whole day off for everyone shown: one quiet line ("Thanksgiving break"). */
  off: string | null;
  /** Under several children, a child who is off while the others work: "Frank · Dentist". */
  notes: string[];
  /** 0..1, this day's effort against the week's busiest day (no numbers are shown). */
  load: number;
}

const weekdayOf = (d: LocalDate): number => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))).getUTCDay();

/** The name of the break or day off that covers `date` for this child, or null. A missed day carries its work forward and is not a day off. */
export function dayOffName(blocked: readonly BlockedRange[], childId: string, date: LocalDate): string | null {
  for (const b of blocked) {
    if (b.kind === "missed") continue;
    if (b.childIds.length > 0 && !b.childIds.includes(childId)) continue;
    if (date < b.startDate || date > b.endDate) continue;
    return b.label?.trim() || BREAK_WORD[b.kind] || "Day off";
  }
  return null;
}

/** The days of the week starting `weekStart`: the family's school days, plus any other day that has work (so no line on paper is missing here). */
export function buildDays(kids: readonly Child[], plans: readonly ChildPlan[], weekStart: LocalDate, l: SheetLookups, blocked: readonly BlockedRange[], schoolDays: readonly number[], withNames: boolean): DayColumn[] {
  const weekEnd = addDays(weekStart, 6);
  const sheets = kids.map((k) => buildSheet(k, plans, weekStart, weekEnd, l, blocked, schoolDays));
  const kidIds = new Set(kids.map((k) => k.id));
  const lines = new Map<LocalDate, DayLine[]>();
  sheets.forEach((s) => {
    for (const subject of s.subjects) {
      for (const a of subject.assignments) {
        for (const r of a.rows) {
          const list = lines.get(r.date) ?? [];
          list.push({ key: `${r.date}/${s.childId}/${a.assignmentId}`, childId: s.childId, childName: s.childName, assignmentId: a.assignmentId, title: a.title, subjectId: subject.subjectId, slot: subject.slot, range: r.range });
          lines.set(r.date, list);
        }
      }
    }
  });
  const effort = new Map<LocalDate, number>();
  for (const p of plans) {
    if (!kidIds.has(p.childId)) continue;
    for (const d of p.days) {
      if (d.date < weekStart || d.date > weekEnd || d.units <= EPS || (p.endedOn && d.date > p.endedOn)) continue;
      effort.set(d.date, (effort.get(d.date) ?? 0) + d.thickness);
    }
  }
  const busiest = Math.max(0, ...effort.values());
  const columns: DayColumn[] = [];
  for (let date = weekStart; date <= weekEnd; date = addDays(date, 1)) {
    const mine = lines.get(date) ?? [];
    if (mine.length === 0 && !schoolDays.includes(weekdayOf(date))) continue;
    const offBy = kids.map((k) => ({ k, name: dayOffName(blocked, k.id, date) })).filter((x): x is { k: Child; name: string } => x.name !== null);
    const everyoneOff = mine.length === 0 && offBy.length === kids.length && kids.length > 0;
    const off = everyoneOff ? [...new Set(offBy.map((x) => x.name))].join(" · ") : null;
    const notes = !everyoneOff && withNames ? offBy.filter((x) => !mine.some((m) => m.childId === x.k.id)).map((x) => `${x.k.name} · ${x.name}`) : [];
    const e = effort.get(date) ?? 0;
    columns.push({ date, heading: `${dayAbbr(date)}, ${formatShort(date)}`, lines: mine, off, notes, load: busiest > 0 ? e / busiest : 0 });
  }
  return columns;
}
