/** Which way a changed check-in row went (S2b-26). Pure. */
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem } from "../../api/types";

/** Same tolerance as the API's "as planned" (S2b-24). */
export const ON_PLAN_TOLERANCE = 0.5;

/** One row's identity on the card: assignment × child. */
export const itemKey = (i: Pick<CheckInItem, "assignmentId" | "childId">) => `${i.assignmentId}/${i.childId}`;

export type RowOutcome = "asPlanned" | "behind" | "ahead" | "finished";

/** Within the API's tolerance counts as done (not sent); reaching the total is finished (no question). */
export function rowOutcome(item: Pick<CheckInItem, "plannedTo" | "totalUnits">, position: number): RowOutcome {
  if (Math.abs(position - item.plannedTo) <= ON_PLAN_TOLERANCE) return "asPlanned";
  if (position >= item.totalUnits) return "finished";
  return position < item.plannedTo ? "behind" : "ahead";
}

/** A new difference keeps the end date (D10); T-09 no longer asks. */
export const DEFAULT_MODE: OverrideMode = "keepEndDate";
