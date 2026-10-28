/** Which way a changed check-in row went, and how to say it (S2b-26). Pure. */
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem } from "../../api/types";
import { formatAmount } from "../../components/unitLabels";
import { ON_PLAN_TOLERANCE } from "./progress";

/** One row's identity on the card: assignment × child. */
export const itemKey = (i: Pick<CheckInItem, "assignmentId" | "childId">) => `${i.assignmentId}/${i.childId}`;

export type RowOutcome = "asPlanned" | "behind" | "ahead" | "finished";
export type Direction = "behind" | "ahead";

/** Within the API's tolerance counts as done (not sent); reaching the total is finished (no question). */
export function rowOutcome(item: Pick<CheckInItem, "plannedTo" | "totalUnits">, position: number): RowOutcome {
  if (Math.abs(position - item.plannedTo) <= ON_PLAN_TOLERANCE) return "asPlanned";
  if (position >= item.totalUnits) return "finished";
  return position < item.plannedTo ? "behind" : "ahead";
}

/** "Margaret is 15 pages behind on Story of the World." / "Frank finished Treasure Island early 🎉" */
export function outcomeText(item: CheckInItem, position: number): string {
  const outcome = rowOutcome(item, position);
  if (outcome === "finished") return `${item.childName} finished ${item.title} early 🎉`;
  if (outcome === "asPlanned") return `${item.childName} is on plan with ${item.title}.`;
  const amount = formatAmount(item.unitType, Math.round(Math.abs(position - item.plannedTo) * 100) / 100);
  return `${item.childName} is ${amount} ${outcome} on ${item.title}.`;
}

/** The two answers per direction; keepEndDate comes first and is the default (D10). */
export const CHOICES: Readonly<Record<Direction, readonly { mode: OverrideMode; label: string }[]>> = {
  behind: [
    { mode: "keepEndDate", label: "Thicken the remaining weeks" },
    { mode: "pushEndDate", label: "Push the end date" },
  ],
  ahead: [
    { mode: "keepEndDate", label: "Thin the remaining bars" },
    { mode: "pushEndDate", label: "Pull the end date in" },
  ],
};

export const DEFAULT_MODE: OverrideMode = "keepEndDate";
