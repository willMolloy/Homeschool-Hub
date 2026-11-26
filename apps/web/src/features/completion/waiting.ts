/**
 * S12-02: which assignments are waiting for the parent's answer, and how each question is worded. One rule decides: an assignment
 * that is not archived, has no `endedAs`, and whose stored end date is before today (the family's today, from `/api/me`) is
 * waiting. Nothing else asks: a late line or a heavy week is a warning in the briefing, never a question. Moving the end later
 * (Not yet) takes an assignment off the list until the new end passes. Only the parent's answer ends one (Will, 2026-11-04).
 * The needs-you dot and Home's card both read this list, so they always agree.
 */
import { isValidLocalDate, type LocalDate } from "@hh/engine";
import type { Assignment, Child } from "../../api/types";
import { deviceToday } from "../plan/useShownWeek";

/** The family's today from `/api/me` (its own time zone), else the device's day. */
export const todayOf = (me: { today: string }): LocalDate => (isValidLocalDate(me.today) ? me.today : deviceToday());

/** True when `a` is waiting for an answer as of `today`. A shared book uses this only when it has no per-child rows. */
export function isWaiting(a: Assignment, today: LocalDate): boolean {
  return !a.archived && !a.endedAs && a.endDate < today;
}

/** One child's end and ending. Without per-child rows, every child uses the book's. */
export function scheduleOf(a: Assignment, childId: string): { endDate: string; endedAs: "finished" | "stopped" | null; endedOn: string | null } {
  const row = a.children?.find((c) => c.childId === childId);
  if (!row) return { endDate: a.endDate, endedAs: a.endedAs ?? null, endedOn: a.endedOn ?? null };
  return { endDate: row.endDate, endedAs: row.endedAs ?? null, endedOn: row.endedOn ?? null };
}

/** "Frank", "Frank and Margaret", "Frank, Margaret and Leo". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** One question for one child: "Did Elias finish Treasure Island?" */
export interface WaitingQuestion {
  assignment: Assignment;
  /** The child this question is about. */
  child: Child;
  /** That one child, so older callers that read `children` still name them. */
  children: Child[];
  /** That child's end. */
  endDate: string;
  /** "Did Elias finish Treasure Island?" */
  text: string;
}

/**
 * One question per child whose own end has passed and who is not finished or stopped. Oldest end first, then title,
 * then the child in roster order. An archived child is never asked. A book nobody active is on is not asked about.
 */
export function waitingQuestions(assignments: readonly Assignment[], children: readonly Child[], today: LocalDate): WaitingQuestion[] {
  const roster = children.filter((c) => !c.archived).sort((x, y) => x.sortOrder - y.sortOrder || x.name.localeCompare(y.name));
  const out: WaitingQuestion[] = [];
  for (const a of assignments) {
    if (a.archived) continue;
    for (const child of roster) {
      if (!a.childIds.includes(child.id)) continue;
      const sch = scheduleOf(a, child.id);
      if (sch.endedAs || !(sch.endDate < today)) continue;
      out.push({ assignment: a, child, children: [child], endDate: sch.endDate, text: `Did ${child.name} finish ${a.title}?` });
    }
  }
  return out.sort((x, y) =>
    x.endDate.localeCompare(y.endDate) || x.assignment.title.localeCompare(y.assignment.title) || x.assignment.id.localeCompare(y.assignment.id)
    || x.child.sortOrder - y.child.sortOrder || x.child.name.localeCompare(y.child.name));
}

/** The id of one question, so answering Elias does not clear Margaret's question on the same book. */
export const questionKey = (q: Pick<WaitingQuestion, "assignment" | "child">): string => `${q.assignment.id}:${q.child.id}`;
