/**
 * S7-01 / S7-02: copying a set of assignments (the plan only: no check-ins, adjustments or progress) in one go.
 * Pure helpers plus the chunked bulk save both copy panels share.
 */
import { addDays } from "@hh/engine";
import { apiPost } from "../../api/client";
import type { Assignment } from "../../api/types";
import { bulkSaveError, sameSet } from "./formBits";
import type { Lookups } from "./lookups";

/** POST /api/assignments/bulk takes at most this many (S3a-03). */
export const BULK_CHUNK = 50;

/** The fields a copy keeps; `weightPerUnit` and `weekdays` are as stored (null stays null). */
export interface CopyBody {
  subjectId: string;
  title: string;
  unitType: Assignment["unitType"];
  totalUnits: number;
  weightPerUnit: number | null;
  startDate: string;
  endDate: string;
  childIds: string[];
  weekdays: number[] | null;
}

/** Active assignments that can be saved again: the subject and at least one child are still active. */
export function copyCandidates(list: readonly Assignment[], l: Lookups): Assignment[] {
  const activeChild = (id: string) => l.children.some((c) => c.id === id && !c.archived);
  const activeSubject = (id: string) => l.subjects.some((s) => s.id === id && !s.archived);
  return list.filter((a) => !a.archived && activeSubject(a.subjectId) && a.childIds.some(activeChild));
}

/** The copy of `a` with both dates moved by `days`; `childIds` replaces the children when given (else archived ones are dropped). */
export function shiftedCopy(a: Assignment, days: number, l: Lookups, childIds?: string[]): CopyBody {
  const keep = childIds ?? a.childIds.filter((id) => l.children.some((c) => c.id === id && !c.archived));
  return {
    subjectId: a.subjectId,
    title: a.title,
    unitType: a.unitType,
    totalUnits: a.totalUnits,
    weightPerUnit: a.weightPerUnit,
    startDate: addDays(a.startDate, days),
    endDate: addDays(a.endDate, days),
    childIds: keep,
    weekdays: a.weekdays,
  };
}

export interface ChunkedResult {
  created: Assignment[];
  /** Set when a chunk failed: the earlier chunks stay saved. `saved` is how many bodies were created before it. */
  failure: { part: number; parts: number; message: string } | null;
}

/**
 * Sends the copies in chunks of 50, stopping at the first chunk that fails. S7b-11: with `undoLabel` (given the number
 * created so far, `already` counting an earlier part of the same copy) the copy is one undo entry: the first chunk makes it and each
 * later chunk adds to it.
 */
export async function saveInChunks(
  bodies: readonly object[], undoLabel?: (created: number) => string, already = 0,
  /** S14-05: names item `position` (1-based, over every chunk) in a server message; default its title. */
  nameOf: (position: number) => string | undefined = (n) => (bodies[n - 1] as { title?: string } | undefined)?.title,
): Promise<ChunkedResult> {
  const created: Assignment[] = [];
  const parts = Math.ceil(bodies.length / BULK_CHUNK);
  for (let p = 0; p < parts; p++) {
    const chunk = bodies.slice(p * BULK_CHUNK, (p + 1) * BULK_CHUNK);
    try {
      const undo = undoLabel ? { undo: { label: undoLabel(already + created.length + chunk.length), ...(p > 0 || already > 0 ? { append: true } : {}) } } : {};
      created.push(...(await apiPost<Assignment[]>("/api/assignments/bulk", { assignments: chunk, ...undo })));
    } catch (err) {
      return { created, failure: { part: p + 1, parts, message: bulkSaveError(err, (n) => nameOf(p * BULK_CHUNK + n)) } };
    }
  }
  return { created, failure: null };
}

/**
 * S14-05: the message under Add several and Import CSV after a failed save. One chunk (the usual case): just the server's reason, named by
 * its row; several: which part failed and how many earlier ones were saved (they stay, and the undo bar offers to remove them).
 */
export function bulkFailureText(r: ChunkedResult): string {
  const f = r.failure;
  if (!f) return "";
  if (f.parts === 1) return f.message;
  const done = r.created.length === 0 ? "Nothing was added." : `${r.created.length} ${r.created.length === 1 ? "assignment was" : "assignments were"} added. Undo removes them.`;
  return `Part ${f.part} of ${f.parts} didn't save: ${f.message} ${done}`;
}

/** "Part 2 of 3 didn't save" plus how many were created, for the panel's message. */
export function chunkFailureText(r: ChunkedResult): string {
  const f = r.failure;
  if (!f) return "";
  const done = r.created.length === 0 ? "Nothing was created." : `${r.created.length} ${r.created.length === 1 ? "copy was" : "copies were"} created.`;
  return `${f.parts > 1 ? `Part ${f.part} of ${f.parts} didn't save` : "Couldn't save the copies"}: ${f.message} ${done}`;
}

/** S7b-11: "2027–28" for a year starting in 2027. */
export const yearName = (firstDay: string): string => {
  const y = Number(firstDay.slice(0, 4));
  return `${y}–${String(y + 1).slice(2)}`;
};

/**
 * S7b-11: true when `existing` already holds the copy `copy` would make: the same subject, title and children, on the same dates.
 * Archived assignments don't count (they are out of the plan).
 */
export function alreadyCopied(copy: CopyBody, existing: readonly Assignment[]): boolean {
  return existing.some((e) => !e.archived && e.subjectId === copy.subjectId && e.title === copy.title && sameSet(e.childIds, copy.childIds)
    && e.startDate === copy.startDate && e.endDate === copy.endDate);
}

/**
 * S7b-12: true when `child` already has `a`: it is on the assignment, or has one with the same subject and title on the same
 * (or the shifted copy's) dates.
 */
export function childAlreadyHas(a: Assignment, copy: CopyBody, child: string, existing: readonly Assignment[]): boolean {
  if (a.childIds.includes(child)) return true;
  return existing.some((e) => !e.archived && e.childIds.includes(child) && e.subjectId === a.subjectId && e.title === a.title
    && ((e.startDate === a.startDate && e.endDate === a.endDate) || (e.startDate === copy.startDate && e.endDate === copy.endDate)));
}
