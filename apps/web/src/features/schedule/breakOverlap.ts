/**
 * S21-01: turn the family's books and the break she is saving into the engine's overlap list.
 * The sheet (BreakOverlapSheet) asks what to do. Nothing here saves.
 */
import { listBreakOverlaps, type BreakOverlap, type BreakSpan, type OverlapAssignment } from "@hh/engine";
import { apiGet, apiPost } from "../../api/client";
import type { Assignment, BlockedKind, BlockedRange, Subject } from "../../api/types";

export interface ProposedBreak {
  label: string | null;
  start: string;
  end: string;
  childIds: string[];
}

export function toSpan(b: { start: string; end: string; childIds: readonly string[] } | { startDate: string; endDate: string; childIds: readonly string[] }): BreakSpan {
  if ("startDate" in b) return { start: b.startDate, end: b.endDate, childIds: b.childIds };
  return { start: b.start, end: b.end, childIds: b.childIds };
}

export function toOverlapAssignment(a: Assignment): OverlapAssignment {
  return {
    id: a.id,
    title: a.title,
    start: a.startDate,
    end: a.endDate,
    childIds: a.childIds,
    weekdays: a.weekdays,
    subjectId: a.subjectId,
    endedAs: a.endedAs ?? null,
    archived: a.archived,
    children: a.children?.map((c) => ({ childId: c.childId, end: c.endDate, endedAs: c.endedAs ?? null })),
  };
}

export interface OverlapContext {
  rows: BreakOverlap[];
  assignments: OverlapAssignment[];
  subjectWeekdays: { subjectId: string; weekdays: number[] | null }[];
  childName: (id: string) => string;
}

/** The open books this save would cover. Loads the books and the subjects' days. */
export async function overlapContext(proposed: readonly ProposedBreak[], existing: readonly BlockedRange[], schoolDays: readonly number[]): Promise<OverlapContext> {
  const [assignments, subjects, children] = await Promise.all([
    apiGet<Assignment[]>("/api/assignments"),
    apiGet<Subject[]>("/api/subjects"),
    apiGet<{ id: string; name: string }[]>("/api/children"),
  ]);
  const subjectWeekdays = subjects.map((s) => ({ subjectId: s.id, weekdays: s.defaultWeekdays }));
  const books = assignments.map(toOverlapAssignment);
  const rows = listBreakOverlaps({
    breaks: proposed.map(toSpan),
    assignments: books,
    existing: existing.map(toSpan),
    schoolDays,
    subjectWeekdays,
  });
  const names = new Map(children.map((c) => [c.id, c.name]));
  return { rows, assignments: books, subjectWeekdays, childName: (id: string) => names.get(id) ?? "them" };
}

/** One break, one save, one undo. Cancel returns null and writes nothing. */
export async function saveOneBreak(
  ask: (proposed: ProposedBreak[], existing: readonly BlockedRange[], perform: (adjustments: { assignmentId: string; endDate: string; childId?: string }[] | null) => Promise<void>) => Promise<boolean>,
  body: { label: string | null; kind: BlockedKind; startDate: string; endDate: string; childIds: string[] },
  existing: readonly BlockedRange[],
): Promise<BlockedRange | null> {
  let created: BlockedRange | null = null;
  const ok = await ask(
    [{ label: body.label, start: body.startDate, end: body.endDate, childIds: body.childIds }],
    existing,
    async (adjustments) => {
      created = await apiPost<BlockedRange>("/api/blocked-ranges", { ...body, ...(adjustments ? { adjustments } : {}) });
    },
  );
  return ok ? created : null;
}
