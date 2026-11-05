/**
 * S13-04, S16-10: Term in review, the numbers. One child, one range, real data only, and exactly what the family's log setup tracks
 * (S9-03): school days, total hours, core and non-core hours, hours by subject, home and away hours, and the books read (the titles
 * typed in log entries, as Records lists them). The numbers are the Records totals (`GET /api/records/totals`, S9b-01 range rules).
 * Nothing comes from the schedule or from completions, and notes never appear. A part that isn't tracked or has nothing in it is
 * absent (null or an empty list), never zero. No favourites, no estimates.
 */
import type { Child, LogFields, RecordTotals, Subject } from "../../api/types";

export interface SubjectTime { subjectId: string; name: string; minutes: number }

export interface TermReview {
  childId: string;
  childName: string;
  /** The child's stored colour (a hex), or null. */
  childColor: string | null;
  start: string;
  end: string;
  /** Days with school logged, or null when school days aren't tracked or there were none. */
  schoolDays: number | null;
  /** All the logged time, or null when time isn't tracked or none was logged. Always set when hours by subject is on (the bars' "in all"). */
  totalMinutes: number | null;
  /** True when the log tracks total hours: the total is then a big number of its own. */
  totalHours: boolean;
  /** Core and non-core hours, null unless core / non-core is tracked and that part has time. */
  coreMinutes: number | null;
  nonCoreMinutes: number | null;
  /** Most time first. Empty when subject hours aren't tracked or nothing was logged. */
  bySubject: SubjectTime[];
  /** Home and away hours, null unless home / away is tracked and that part has time. */
  homeMinutes: number | null;
  awayMinutes: number | null;
  /** The titles typed in log entries, de-duplicated, in the order first logged. Empty when books aren't tracked or none. */
  books: string[];
}

export interface TermReviewInput {
  child: Child;
  range: { start: string; end: string };
  subjects: readonly Subject[];
  fields: LogFields;
  /** The Records totals for this child and range. */
  totals: RecordTotals;
}

const some = (m: number, on: boolean): number | null => (on && m > 0 ? m : null);

export function buildTermReview({ child, range, subjects, fields, totals }: TermReviewInput): TermReview {
  const bySubject = fields.subjectHours
    ? totals.bySubject.filter((s) => s.minutes > 0).map((s) => ({ subjectId: s.subjectId, name: subjects.find((x) => x.id === s.subjectId)?.name ?? "A subject", minutes: s.minutes }))
        .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))
    : [];
  const timeTracked = fields.subjectHours || fields.totalHours;
  return {
    childId: child.id, childName: child.name, childColor: child.color, start: range.start, end: range.end,
    schoolDays: some(totals.schoolDays, fields.schoolDays),
    totalMinutes: some(totals.totalMinutes, timeTracked),
    totalHours: fields.totalHours,
    coreMinutes: some(totals.coreMinutes, fields.coreSplit),
    nonCoreMinutes: some(totals.nonCoreMinutes, fields.coreSplit),
    bySubject,
    homeMinutes: some(totals.homeMinutes, fields.homeAway),
    awayMinutes: some(totals.awayMinutes, fields.homeAway),
    books: fields.books ? [...totals.books] : [],
  };
}

/** How many parts have something to show; 0 means the page says "Nothing logged for this term yet" instead of a card. */
export function partCount(r: TermReview): number {
  return [r.schoolDays !== null, r.totalHours && r.totalMinutes !== null, r.coreMinutes !== null || r.nonCoreMinutes !== null, r.bySubject.length > 0,
    r.homeMinutes !== null || r.awayMinutes !== null, r.books.length > 0].filter(Boolean).length;
}
