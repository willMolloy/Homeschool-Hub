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

/** True when `a` is waiting for an answer as of `today`. */
export function isWaiting(a: Assignment, today: LocalDate): boolean {
  return !a.archived && !a.endedAs && a.endDate < today;
}

/** "Frank", "Frank and Margaret", "Frank, Margaret and Leo". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** One question for the parent: the assignment, the children on it (roster order) and the words of the question. */
export interface WaitingQuestion {
  assignment: Assignment;
  children: Child[];
  /** "Did Frank and Margaret finish History spine?" */
  text: string;
}

/**
 * The waiting assignments, oldest end first (ties by title, then id), each with the active children on it. An assignment with
 * nobody active left on it is not asked about (the plan leaves it out too). Archived children are never named.
 */
export function waitingQuestions(assignments: readonly Assignment[], children: readonly Child[], today: LocalDate): WaitingQuestion[] {
  const roster = children.filter((c) => !c.archived).sort((x, y) => x.sortOrder - y.sortOrder || x.name.localeCompare(y.name));
  const out: WaitingQuestion[] = [];
  for (const a of assignments) {
    if (!isWaiting(a, today)) continue;
    const kids = roster.filter((c) => a.childIds.includes(c.id));
    if (kids.length === 0) continue;
    out.push({ assignment: a, children: kids, text: `Did ${joinNames(kids.map((k) => k.name))} finish ${a.title}?` });
  }
  return out.sort((x, y) =>
    x.assignment.endDate.localeCompare(y.assignment.endDate) || x.assignment.title.localeCompare(y.assignment.title) || x.assignment.id.localeCompare(y.assignment.id));
}
