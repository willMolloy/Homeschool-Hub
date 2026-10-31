/**
 * S7-01 / S7-02: copying a set of assignments (the plan only: no check-ins, adjustments or progress) in one go.
 * Pure helpers plus the chunked bulk save both copy panels share.
 */
import { addDays } from "@hh/engine";
import { apiPost } from "../../api/client";
import type { Assignment } from "../../api/types";
import { bulkSaveError } from "./formBits";
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

/** Sends the copies in chunks of 50, stopping at the first chunk that fails. */
export async function saveInChunks(bodies: readonly CopyBody[]): Promise<ChunkedResult> {
  const created: Assignment[] = [];
  const parts = Math.ceil(bodies.length / BULK_CHUNK);
  for (let p = 0; p < parts; p++) {
    const chunk = bodies.slice(p * BULK_CHUNK, (p + 1) * BULK_CHUNK);
    try {
      created.push(...(await apiPost<Assignment[]>("/api/assignments/bulk", { assignments: chunk })));
    } catch (err) {
      return { created, failure: { part: p + 1, parts, message: bulkSaveError(err, (n) => chunk[n - 1]?.title) } };
    }
  }
  return { created, failure: null };
}

/** "Part 2 of 3 didn't save" plus how many were created, for the panel's message. */
export function chunkFailureText(r: ChunkedResult): string {
  const f = r.failure;
  if (!f) return "";
  const done = r.created.length === 0 ? "Nothing was created." : `${r.created.length} ${r.created.length === 1 ? "copy was" : "copies were"} created.`;
  return `${f.parts > 1 ? `Part ${f.part} of ${f.parts} didn't save` : "Couldn't save the copies"}: ${f.message} ${done}`;
}
