/**
 * S16-05: the two honest numbers behind Records' cards, from what the parent answered and typed (never inferred).
 * - Books finished: reading assignments (their unit is pages or chapters) the parent marked finished (Sprint 12 `endedAs = finished`),
 *   with `endedOn` inside the range, for the children asked about. An assignment shared by two children is one book.
 *   Records, Term in review and the CSV all use this one definition.
 * - School days of one child: the distinct days that child's counted entries cover inside the range.
 */
import type { Assignment, RecordEntry } from "../../api/types";
import { distinctSchoolDays, partInRange } from "./share";

export interface FinishedBook { assignmentId: string; title: string; finishedOn: string }

export const READING_UNITS: readonly string[] = ["pages", "chapters"];

/** `childIds` null = every child. Oldest finish first, then by title. */
export function booksFinished(assignments: readonly Assignment[], range: { start: string; end: string }, childIds: readonly string[] | null): FinishedBook[] {
  return assignments
    .filter((a) => !a.archived && a.endedAs === "finished" && a.endedOn && a.endedOn >= range.start && a.endedOn <= range.end
      && READING_UNITS.includes(a.unitType) && (childIds === null || a.childIds.some((id) => childIds.includes(id))))
    .map((a) => ({ assignmentId: a.id, title: a.title, finishedOn: a.endedOn! }))
    .sort((x, y) => x.finishedOn.localeCompare(y.finishedOn) || x.title.localeCompare(y.title) || x.assignmentId.localeCompare(y.assignmentId));
}

/** One child's own school days in the range (a day two entries hold counts once). */
export function schoolDaysOf(entries: readonly RecordEntry[], childId: string, range: { start: string; end: string }): number {
  const parts = entries.filter((e) => e.childId === childId).map((e) => partInRange(e, range.start, range.end)).filter((e): e is NonNullable<typeof e> => e !== null);
  return distinctSchoolDays(parts);
}
