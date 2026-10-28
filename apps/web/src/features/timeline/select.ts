/**
 * T-07: what the adjust sheet needs about the selected assignment, and the end-date steps. Pure.
 */
import { addDays, type LocalDate } from "@hh/engine";
import type { Assignment } from "../../api/types";
import type { TimelineModel } from "./model";

/** One step of the adjust buttons. */
export const WEEK_DAYS = 7;

/** The end moved by whole weeks (negative = earlier). */
export const shiftEnd = (end: string, weeks: number): string => addDays(end as LocalDate, weeks * WEEK_DAYS);

/** Ending a week earlier must not put the end before the start (ISO dates compare as strings). */
export const canEndEarlier = (start: string, end: string): boolean => shiftEnd(end, -1) >= start;

export interface Selection {
  assignmentId: string;
  title: string;
  /** "Reading · Ada" or "Reading · Ada, Ben" for a shared assignment. */
  subtitle: string;
  startDate: string;
  endDate: string;
}

/** The selected assignment as the sheet shows it, or null when it isn't on the timeline any more. */
export function selectionFor(model: TimelineModel, assignments: Assignment[], id: string): Selection | null {
  const raw = assignments.find((a) => a.id === id);
  if (!raw) return null;
  let subject: string | null = null;
  const children: string[] = [];
  for (const s of model.lanes) {
    for (const c of s.children) {
      if (!c.assignments.some((a) => a.assignmentId === id)) continue;
      subject ??= s.name;
      if (!children.includes(c.childName)) children.push(c.childName);
    }
  }
  if (subject === null) return null;
  return { assignmentId: id, title: raw.title, subtitle: `${subject} · ${children.join(", ")}`, startDate: raw.startDate, endDate: raw.endDate };
}
