/**
 * weight_choice (S2b-04): the append-only history of weights a parent set for each child on a pages or
 * chapters assignment. Written inside the assignment save (S2b-07); read to suggest a default (S2b-08).
 */
import { USUAL_WEIGHT_WINDOW, isLearnedUnit, type LearnedUnitType, type UnitType, type WeightChoice } from "@hh/engine";
import type { Queryable, Tx } from "../db";

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
 * Returns the new rows' ids (as strings) so an undo (S6-06) can take them back.
 */
export async function recordWeightChoices(tx: Tx, c: WeightChoiceWrite): Promise<string[]> {
  if (!isLearnedUnit(c.unitType) || c.childIds.length === 0) return [];
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight)
     SELECT $1, child_id, $2, $3, $4 FROM unnest($5::uuid[]) AS child_id RETURNING id`,
    [c.familyId, c.assignmentId, c.unitType, c.weight, c.childIds]);
  return rows.map((r) => r.id);
}

/** A child's history row, ready for the engine's `usualWeight`. */
export interface ChildWeightChoice extends WeightChoice {
  childId: string;
}

/**
 * Each child's usual-weight window (S2b-08) in one query: the latest choice per assignment, cleared ones
 * dropped, then the newest USUAL_WEIGHT_WINDOW per child. Scoped to the family; archived assignments count.
 */
export async function choicesFor(db: Queryable, familyId: string, childIds: string[], unitType: LearnedUnitType): Promise<ChildWeightChoice[]> {
  if (childIds.length === 0) return [];
  const { rows } = await db.query<{ child_id: string; assignment_id: string; weight: number; chosen_at: Date; id: string }>(
    `SELECT child_id, assignment_id, weight, chosen_at, id FROM (
       SELECT l.*, row_number() OVER (PARTITION BY child_id ORDER BY chosen_at DESC, id DESC) AS rn
       FROM (
         SELECT DISTINCT ON (child_id, assignment_id) child_id, assignment_id, weight, chosen_at, id
         FROM weight_choice
         WHERE family_id = $1 AND unit_type = $2 AND child_id = ANY($3::uuid[])
         ORDER BY child_id, assignment_id, chosen_at DESC, id DESC
       ) l
       WHERE l.weight IS NOT NULL
     ) w
     WHERE rn <= $4
     ORDER BY child_id, chosen_at DESC, id DESC`,
    [familyId, unitType, childIds, USUAL_WEIGHT_WINDOW]);
  return rows.map((r) => ({
    childId: r.child_id, assignmentId: r.assignment_id, weight: Number(r.weight), chosenAt: r.chosen_at.toISOString(), id: Number(r.id),
  }));
}
