/**
 * weight_choice (S2b-04): the append-only history of weights a parent set for each child on a pages or
 * chapters assignment. Written inside the assignment save (S2b-07); read to suggest a default (S2b-08).
 */
import { isLearnedUnit, type UnitType } from "@hh/engine";
import type { Tx } from "../db";

export interface WeightChoiceWrite {
  familyId: string;
  assignmentId: string;
  childIds: string[];
  unitType: UnitType;
  /** null = cleared back to the default. */
  weight: number | null;
}

/**
 * Append one choice per child. A no-op for units that aren't learned (lessons, minutes: D17) or no children.
 * Takes the save's `Tx` (RF-11), so a failed save leaves no choice behind.
 */
export async function recordWeightChoices(tx: Tx, c: WeightChoiceWrite): Promise<void> {
  if (!isLearnedUnit(c.unitType) || c.childIds.length === 0) return;
  await tx.query(
    `INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight)
     SELECT $1, child_id, $2, $3, $4 FROM unnest($5::uuid[]) AS child_id`,
    [c.familyId, c.assignmentId, c.unitType, c.weight, c.childIds]);
}
