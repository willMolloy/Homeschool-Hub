/**
 * T-07/T-07e: what the edit bar needs about the selected assignment. Pure. S6b-05: the week-step helpers
 * (`shiftEnd`, `canEndEarlier`, `moveWeeks`) went with their buttons.
 */
import type { Assignment } from "../../api/types";
import type { TimelineModel } from "./model";

export interface DateSpan { startDate: string; endDate: string }

/** T-07e: only the fields that differ from `from`, or null when nothing changed. */
export function changedDates(from: DateSpan, to: DateSpan): Partial<DateSpan> | null {
  const out: Partial<DateSpan> = {};
  if (to.startDate !== from.startDate) out.startDate = to.startDate;
  if (to.endDate !== from.endDate) out.endDate = to.endDate;
  return Object.keys(out).length ? out : null;
}

/** T-07e: the start must be on or before the end. */
export const datesError = (s: DateSpan): string | null => (s.startDate > s.endDate ? "The start must be on or before the end." : null);

export interface Selection extends DateSpan {
  assignmentId: string;
  title: string;
  /** "Reading · Ada" or "Reading · Ada, Ben" for a shared assignment. */
  subtitle: string;
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
