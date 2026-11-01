/**
 * S9-08, S9b-01: totals for a range, from log entries only (never the plan, never check-ins).
 * School days are distinct calendar days: per child, the union of the days that child's entries count inside the range, so two
 * entries on one day count once; under All children, the union across children ("days any child did school"), with each
 * child's own count alongside. An entry that overlaps the range counts only its days inside it, and its typed hours count in
 * proportion: one entry over 5 school days with 10 h, 2 days inside, adds 4 h. (An entry with no school days, a switch-off
 * run, is cut by calendar days instead.) Hours of an entry: its subject minutes when it has any, else its typed total. Core and
 * non-core use each subject's current flag; time typed only as a total counts in the total but in neither split.
 */
import type { RecordEntryRow } from "../repos/recordEntryRepo";

export interface Totals {
  /** Entries that overlap the range. */
  entries: number;
  /** Of those, the ones only partly inside it. */
  partialEntries: number;
  schoolDays: number;
  perChild: { childId: string; schoolDays: number }[];
  totalMinutes: number;
  coreMinutes: number;
  nonCoreMinutes: number;
  homeMinutes: number;
  awayMinutes: number;
  /** Distinct titles (case and spacing ignored), in the order first read. */
  books: string[];
  bySubject: { subjectId: string; minutes: number }[];
}

export type DatedEntry = RecordEntryRow & { days: string[] };
export interface Span { from?: string | null; to?: string | null }

const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");
const inside = (d: string, r: Span) => (!r.from || d >= r.from) && (!r.to || d <= r.to);
const dayNo = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

/** The share of an entry's typed time that falls in the range. */
export function shareInRange(e: DatedEntry, r: Span): number {
  const whole = (!r.from || e.start_date >= r.from) && (!r.to || e.end_date <= r.to);
  if (whole) return 1;
  if (e.days.length > 0) return e.days.filter((d) => inside(d, r)).length / e.days.length;
  const lo = r.from && r.from > e.start_date ? r.from : e.start_date;
  const hi = r.to && r.to < e.end_date ? r.to : e.end_date;
  return hi < lo ? 0 : (dayNo(hi) - dayNo(lo) + 1) / (dayNo(e.end_date) - dayNo(e.start_date) + 1);
}

export function totalsOf(entries: readonly DatedEntry[], coreOf: (subjectId: string) => boolean, range: Span = {}): Totals {
  const used = entries.map((e) => ({ e, share: shareInRange(e, range) })).filter((x) => x.share > 0);
  const perChildDays = new Map<string, Set<string>>();
  const allDays = new Set<string>();
  const bySubject = new Map<string, number>();
  const books = new Map<string, string>();
  const t: Totals = { entries: used.length, partialEntries: used.filter((x) => x.share < 1).length, schoolDays: 0, perChild: [], totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] };
  for (const { e, share } of [...used].sort((a, b) => (a.e.start_date < b.e.start_date ? -1 : a.e.start_date > b.e.start_date ? 1 : 0))) {
    const mine = perChildDays.get(e.child_id) ?? new Set<string>();
    for (const d of e.days) if (inside(d, range)) { mine.add(d); allDays.add(d); }
    perChildDays.set(e.child_id, mine);
    const part = (m: number) => Math.round(m * share);
    const subjects = Object.entries(e.subject_minutes);
    let hours = 0;
    for (const [id, m] of subjects) {
      const p = part(m);
      hours += p;
      bySubject.set(id, (bySubject.get(id) ?? 0) + p);
      if (coreOf(id)) t.coreMinutes += p; else t.nonCoreMinutes += p;
    }
    t.totalMinutes += subjects.length > 0 ? hours : part(e.total_minutes ?? 0);
    t.homeMinutes += part(e.home_minutes ?? 0);
    t.awayMinutes += part(e.away_minutes ?? 0);
    for (const b of e.books) if (!books.has(normTitle(b))) books.set(normTitle(b), b);
  }
  t.schoolDays = allDays.size;
  t.perChild = [...perChildDays].map(([childId, days]) => ({ childId, schoolDays: days.size })).sort((a, b) => a.childId.localeCompare(b.childId));
  t.books = [...books.values()];
  t.bySubject = [...bySubject].map(([subjectId, minutes]) => ({ subjectId, minutes })).sort((a, b) => b.minutes - a.minutes || a.subjectId.localeCompare(b.subjectId));
  return t;
}
