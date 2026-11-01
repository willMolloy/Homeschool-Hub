/**
 * S9-08: totals for a range, from log entries only (never the plan, never check-ins). An entry belongs to a range by its first day.
 * Hours of an entry: the subject minutes added up when it has any, else its typed total. Core and non-core use each subject's
 * current flag; time typed as a total only (no subjects) is in the total but in neither split.
 * All children: hours add up; school days are the most any one child logged (the children learn together, so adding would count a day twice); books are listed once.
 */
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

const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

export function totalsOf(entries: readonly RecordEntryRow[], coreOf: (subjectId: string) => boolean): Totals {
  const perChildDays = new Map<string, number>();
  const bySubject = new Map<string, number>();
  const books = new Map<string, string>();
  const t: Totals = { entries: entries.length, schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] };
  // Oldest first so books come out in the order they were read.
  for (const e of [...entries].sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0))) {
    perChildDays.set(e.child_id, (perChildDays.get(e.child_id) ?? 0) + e.school_days);
    const subjects = Object.entries(e.subject_minutes);
    for (const [id, m] of subjects) {
      bySubject.set(id, (bySubject.get(id) ?? 0) + m);
      if (coreOf(id)) t.coreMinutes += m; else t.nonCoreMinutes += m;
    }
    t.totalMinutes += subjects.length > 0 ? subjects.reduce((a, [, m]) => a + m, 0) : e.total_minutes ?? 0;
    t.homeMinutes += e.home_minutes ?? 0;
    t.awayMinutes += e.away_minutes ?? 0;
    for (const b of e.books) if (!books.has(normTitle(b))) books.set(normTitle(b), b);
  }
  t.schoolDays = Math.max(0, ...perChildDays.values());
  t.books = [...books.values()];
  t.bySubject = [...bySubject].map(([subjectId, minutes]) => ({ subjectId, minutes })).sort((a, b) => b.minutes - a.minutes || a.subjectId.localeCompare(b.subjectId));
  return t;
}
