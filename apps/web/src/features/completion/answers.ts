/**
 * S12-03: what each of the three answers sends. Only the parent's answer ends an assignment (Will, 2026-11-04):
 * Yes, finished and We stopped set `endedAs` (an assignment schedule fact, never a log entry); Not yet moves the end date through
 * the same PATCH the Year edit sheet uses, so the plan adjusts and the question returns at the new end.
 */
import { addDays, isValidLocalDate, type LocalDate } from "@hh/engine";
import { apiPatch } from "../../api/client";
import type { Assignment } from "../../api/types";
import { formatDate } from "../../lib/dates";

export type Answer = "finished" | "notyet" | "stopped";

/** The day the answer's date field starts on: the stored end for finished, today for stopped, a week from today for Not yet. */
export function defaultDay(answer: Answer, a: Assignment, today: LocalDate): LocalDate {
  return answer === "finished" ? a.endDate : answer === "stopped" ? (today > a.startDate ? today : a.startDate) : addDays(today, 7);
}

/** The label of the date field. */
export const DAY_LABEL: Record<Answer, string> = { finished: "Finished on", stopped: "Stopped on", notyet: "New end date" };

/** What the sheet is called, e.g. "Finished Treasure Island". */
export function sheetTitle(answer: Answer, title: string): string {
  return answer === "finished" ? `Finished ${title}` : answer === "stopped" ? `Stopped ${title}` : `Move the end of ${title}`;
}

/** The parent's words for a problem with the chosen day, or null when it is fine. */
export function dayProblem(answer: Answer, a: Assignment, day: string, today: LocalDate): string | null {
  if (!isValidLocalDate(day)) return "Pick a date.";
  if (answer === "notyet") return day < today ? "Pick today or a later day, or the question comes straight back." : day < a.startDate ? `Pick a day after the start, ${formatDate(a.startDate)}.` : null;
  if (day < a.startDate) return `Pick a day on or after the start, ${formatDate(a.startDate)}.`;
  return day > today ? "That day hasn't come yet." : null;
}

/** Save the answer. Rejects with the API's ApiError (its message is in the parent's words). */
export function saveAnswer(answer: Answer, a: Assignment, day: LocalDate): Promise<Assignment> {
  return apiPatch<Assignment>(`/api/assignments/${a.id}`, answer === "notyet" ? { endDate: day } : { endedAs: answer, endedOn: day });
}
