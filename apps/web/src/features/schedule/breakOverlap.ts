/**
 * S21-01: turn the family's books and the break she is saving into the engine's overlap list.
 * The sheet (BreakOverlapSheet) asks what to do. Nothing here saves.
 */
import { listBreakOverlaps, type BreakOverlap, type BreakSpan, type OverlapAssignment } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { Assignment, BlockedRange, Subject } from "../../api/types";

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
  };
}

export interface OverlapContext {
  rows: BreakOverlap[];
  assignments: OverlapAssignment[];
  subjectWeekdays: { subjectId: string; weekdays: number[] | null }[];
}

/** The open books this save would cover. Loads the books and the subjects' days. */
export async function overlapContext(proposed: readonly ProposedBreak[], existing: readonly BlockedRange[], schoolDays: readonly number[]): Promise<OverlapContext> {
  const [assignments, subjects] = await Promise.all([
    apiGet<Assignment[]>("/api/assignments"),
    apiGet<Subject[]>("/api/subjects"),
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
  return { rows, assignments: books, subjectWeekdays };
}
