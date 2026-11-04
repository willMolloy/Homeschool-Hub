/**
 * S9-08, S9b-01: totals for a range, from log entries only (never the plan, never check-ins).
 * School days are real days: the distinct days covered by the counted entries (switch on), so two entries on one day count once.
 * For one child that is the child's own days; for All children it is the days any child did school (the union).
 * An entry that overlaps the range counts only its days inside it, and its typed hours in proportion to its covered days inside
 * (one entry over 5 days with 10 h, 2 days inside: 4 h; a run covering no school days is split by calendar days instead).
 * Hours of an entry: the subject minutes added up when it has any, else its typed total. Core and non-core use each subject's
 * current flag; time typed as a total only (no subjects) is in the total but in neither split. Books are listed once.
 */
import { toDayNumber } from "@hh/engine";
import type { RecordEntryRow } from "../repos/recordEntryRepo";

export interface Totals {
  entries: number;
  schoolDays: number;
  totalMinutes: number;
  coreMinutes: number;
  nonCoreMinutes: number;
  homeMinutes: number;
  awayMinutes: number;
  /** Distinct titles (case and spacing ignored), in the order first read. */
  books: string[];
  bySubject: { subjectId: string; minutes: number }[];
}

export interface Range { from?: string | null; to?: string | null }

const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/** The share of an entry inside a range: its covered days inside, and the fraction of its hours that go with them. */
export function shareInRange(e: { start: string; end: string; covered: readonly string[] }, r: Range): { days: string[]; fraction: number } {
  const from = r.from && r.from > e.start ? r.from : e.start;
  const to = r.to && r.to < e.end ? r.to : e.end;
  if (from > to) return { days: [], fraction: 0 };
  const days = e.covered.filter((d) => d >= from && d <= to);
  if (from === e.start && to === e.end) return { days, fraction: 1 };
  const fraction = e.covered.length > 0
    ? days.length / e.covered.length
    : (toDayNumber(to) - toDayNumber(from) + 1) / (toDayNumber(e.end) - toDayNumber(e.start) + 1);
  return { days, fraction };
}

/** Typed minutes scaled to the share inside a range, kept as whole minutes. */
export const scaled = (m: number, fraction: number): number => (fraction === 1 ? m : Math.round(m * fraction));

export function totalsOf(entries: readonly RecordEntryRow[], coreOf: (subjectId: string) => boolean, coveredOf: (e: RecordEntryRow) => readonly string[], range: Range = {}): Totals {
  const days = new Set<string>();
  const bySubject = new Map<string, number>();
  const books = new Map<string, string>();
  const t: Totals = { entries: 0, schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] };
  // Oldest first so books come out in the order they were read.
  for (const e of [...entries].sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0))) {
    if ((range.from && e.end_date < range.from) || (range.to && e.start_date > range.to)) continue;
    const share = shareInRange({ start: e.start_date, end: e.end_date, covered: coveredOf(e) }, range);
    t.entries += 1;
    if (e.counts_school_day) for (const d of share.days) days.add(d);
    const subjects = Object.entries(e.subject_minutes).map(([id, m]) => [id, scaled(m, share.fraction)] as const);
    for (const [id, m] of subjects) {
      bySubject.set(id, (bySubject.get(id) ?? 0) + m);
      if (coreOf(id)) t.coreMinutes += m; else t.nonCoreMinutes += m;
    }
    t.totalMinutes += subjects.length > 0 ? subjects.reduce((a, [, m]) => a + m, 0) : scaled(e.total_minutes ?? 0, share.fraction);
    t.homeMinutes += scaled(e.home_minutes ?? 0, share.fraction);
    t.awayMinutes += scaled(e.away_minutes ?? 0, share.fraction);
    for (const b of e.books) if (!books.has(normTitle(b))) books.set(normTitle(b), b);
  }
  t.schoolDays = days.size;
  t.books = [...books.values()];
  t.bySubject = [...bySubject].map(([subjectId, minutes]) => ({ subjectId, minutes })).sort((a, b) => b.minutes - a.minutes || a.subjectId.localeCompare(b.subjectId));
  return t;
}
