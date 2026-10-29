/**
 * T-09: one check-in row as amounts within the week ("2 of 3 ch.") rather than positions. Pure.
 * A position is where the child got to; the amount done is how far past the week's start that is.
 */
import type { UnitType } from "@hh/engine";
import type { CheckInItem } from "../../api/types";
import { unitNumber } from "../../components/unitLabels";
import { ON_PLAN_TOLERANCE } from "./absorb";

export type Choice = "asPlanned" | "less" | "more";
type Row = Pick<CheckInItem, "unitType" | "plannedFrom" | "plannedTo" | "totalUnits">;

/** Short unit words for the compact row: "ch.", "pp.", "lessons", "min". */
export function shortUnit(t: UnitType, n: number): string {
  if (t === "chapters") return "ch.";
  if (t === "pages") return "pp.";
  if (t === "minutes") return "min";
  return n === 1 ? "lesson" : "lessons";
}

/** The week's plan, short: "Ch. 4–6", "pp. 1–80", "Lesson 10", "150 min". Fractions round outward. */
export function shortRangeText(t: UnitType, from: number, to: number): string {
  if (t === "minutes") return `${Math.round(to - from)} min`;
  const first = Math.floor(from + 1e-9) + 1;
  const last = Math.max(first, Math.ceil(to - 1e-9));
  const span = first === last ? `${first}` : `${first}–${last}`;
  if (t === "pages") return `${first === last ? "p." : "pp."} ${span}`;
  if (t === "chapters") return `Ch. ${span}`;
  return `${first === last ? "Lesson" : "Lessons"} ${span}`;
}

/** Whole units round to the nearest one in the words; minutes step by 5, others by 1. */
export const stepOf = (t: UnitType) => (t === "minutes" ? 5 : 1);
const round = (n: number) => Math.round(n * 100) / 100;
export const plannedAmount = (r: Row) => round(r.plannedTo - r.plannedFrom);
export const doneAmount = (r: Row, position: number) => round(position - r.plannedFrom);
export const maxAmount = (r: Row) => round(r.totalUnits - r.plannedFrom);
export const positionOfAmount = (r: Row, done: number) => round(r.plannedFrom + done);

/** As planned within the API's tolerance; otherwise less or more. */
export function choiceOf(r: Row, position: number): Choice {
  const d = position - r.plannedTo;
  if (Math.abs(d) <= ON_PLAN_TOLERANCE) return "asPlanned";
  return d < 0 ? "less" : "more";
}

const clampAmount = (r: Row, n: number) => Math.min(maxAmount(r), Math.max(0, round(n)));
/** One step down or up from `done`, landing on whole steps. */
export const stepDown = (r: Row, done: number) => {
  const s = stepOf(r.unitType);
  return clampAmount(r, (Math.ceil(done / s - 1e-9) - 1) * s);
};
export const stepUp = (r: Row, done: number) => {
  const s = stepOf(r.unitType);
  return clampAmount(r, (Math.floor(done / s + 1e-9) + 1) * s);
};

/** Where Less and More start: one step below or above the plan, past the tolerance. Null when impossible. */
export function startAmount(r: Row, choice: Exclude<Choice, "asPlanned">): number | null {
  const planned = plannedAmount(r);
  let n = choice === "less" ? stepDown(r, planned) : stepUp(r, planned);
  if (Math.abs(n - planned) <= ON_PLAN_TOLERANCE) n = choice === "less" ? stepDown(r, n) : stepUp(r, n);
  return choiceOf(r, positionOfAmount(r, n)) === choice ? n : null;
}

/** The row's state, compact: "2 of 3 ch.", "Missed", or "+2 ch." on a row with nothing planned. */
export function compactText(r: Row, position: number): string {
  const done = doneAmount(r, position);
  const planned = plannedAmount(r);
  const unit = shortUnit(r.unitType, Math.round(planned));
  if (planned <= 0) return `+${unitNumber(Math.round(done))} ${shortUnit(r.unitType, Math.round(done))}`;
  if (done <= 0) return "Missed";
  return `${unitNumber(Math.round(done))} of ${unitNumber(Math.round(planned))} ${unit}`;
}
