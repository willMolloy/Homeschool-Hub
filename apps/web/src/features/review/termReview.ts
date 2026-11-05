/**
 * S13-04: Term in review, the numbers. One child, one range (a term view or the year), real data only:
 * - the assignments the parent marked finished (Sprint 12: `endedAs` finished, `endedOn` inside the range), with subject and title;
 * - from Records, only for what the family tracks: books read (log entries), hours by subject, school days, with the same totals
 *   the Records page shows (`GET /api/records/totals`, S9b-01 range rules).
 * A part that isn't tracked or has nothing in it is absent (null or an empty list), never zero. No favourites, no notes, no estimates.
 */
import type { Assignment, Child, LogFields, RecordTotals, Subject } from "../../api/types";
import { booksFinished } from "../records/booksFinished";

export interface FinishedItem { assignmentId: string; title: string; subjectId: string; subjectName: string; finishedOn: string }
export interface SubjectTime { subjectId: string; name: string; minutes: number }

export interface TermReview {
  childId: string;
  childName: string;
  /** The child's stored colour (a hex), or null. */
  childColor: string | null;
  start: string;
  end: string;
  /** In the order they were finished, then by title. Empty when none. */
  finished: FinishedItem[];
  /** S16-05: the reading assignments (pages or chapters) the parent marked finished in the range, the same definition as Records' "Books finished" (titles, in the order finished). Empty when books aren't tracked or none. */
  books: string[];
  /** Most time first. Empty when subject hours aren't tracked or nothing was logged. */
  bySubject: SubjectTime[];
  /** All the logged time in the range, or null when time isn't tracked or none was logged. */
  totalMinutes: number | null;
  /** Days with school logged, or null when school days aren't tracked or there were none. */
  schoolDays: number | null;
}

export interface TermReviewInput {
  child: Child;
  range: { start: string; end: string };
  assignments: readonly Assignment[];
  subjects: readonly Subject[];
  fields: LogFields;
  /** The Records totals for this child and range. */
  totals: RecordTotals;
}

/** The assignments this child finished inside the range, as the parent answered (never guessed from the plan). */
export function finishedIn(child: Child, range: { start: string; end: string }, assignments: readonly Assignment[], subjects: readonly Subject[]): FinishedItem[] {
  return assignments
    .filter((a) => !a.archived && a.endedAs === "finished" && a.endedOn && a.endedOn >= range.start && a.endedOn <= range.end && a.childIds.includes(child.id))
    .map((a) => ({ assignmentId: a.id, title: a.title, subjectId: a.subjectId, subjectName: subjects.find((s) => s.id === a.subjectId)?.name ?? "Other", finishedOn: a.endedOn! }))
    .sort((x, y) => x.finishedOn.localeCompare(y.finishedOn) || x.title.localeCompare(y.title));
}

export function buildTermReview({ child, range, assignments, subjects, fields, totals }: TermReviewInput): TermReview {
  const bySubject = fields.subjectHours
    ? totals.bySubject.filter((s) => s.minutes > 0).map((s) => ({ subjectId: s.subjectId, name: subjects.find((x) => x.id === s.subjectId)?.name ?? "A subject", minutes: s.minutes }))
        .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name))
    : [];
  const timeTracked = fields.subjectHours || fields.totalHours;
  return {
    childId: child.id, childName: child.name, childColor: child.color, start: range.start, end: range.end,
    finished: finishedIn(child, range, assignments, subjects),
    books: fields.books ? booksFinished(assignments, range, [child.id]).map((b) => b.title) : [],
    bySubject,
    totalMinutes: timeTracked && totals.totalMinutes > 0 ? totals.totalMinutes : null,
    schoolDays: fields.schoolDays && totals.schoolDays > 0 ? totals.schoolDays : null,
  };
}

/** How many parts have something to show: finished, books, time by subject (or total time), school days. */
export function partCount(r: TermReview): number {
  return [r.finished.length > 0, r.books.length > 0, r.bySubject.length > 0 || r.totalMinutes !== null, r.schoolDays !== null].filter(Boolean).length;
}
