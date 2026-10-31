/**
 * S6-07 (decision C2): put an assignment back to how it was created. Restores every field in `assignment.original`,
 * removes the assignment's week adjustments and records an undo entry for it (S6-06). Check-ins stay: they record what
 * actually happened. An original subject or children that are archived now are not brought back: the current ones stay
 * for that field and the response says so (`kept`).
 */
import type { Tx } from "../db";
import { query } from "../db";
import { HttpError } from "../http/errors";
import { checkDatesKeepLatestCheckIn } from "../http/checkInDates";
import { getAssignment, lockAssignment, updateAssignment, type AssignmentOriginal, type AssignmentRow } from "../repos/assignmentRepo";
import { recordWeightChoices } from "../repos/weightChoiceRepo";
import { assignmentStep, recordUndo, type UndoStep, type WeekOverrideState } from "./undoService";

export type KeptField = "subject" | "children";

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The reset assignment and the fields that kept their current value. After `lockAssignment`; the caller owns the transaction. */
export async function resetAssignment(tx: Tx, familyId: string, id: string): Promise<{ assignment: AssignmentRow; kept: KeptField[] }> {
  const cur = await lockAssignment(tx, familyId, id);
  if (!cur) throw new HttpError(404, "not_found", "No such assignment.");
  const [{ original }] = await query<{ original: AssignmentOriginal | null }>(tx, "SELECT original FROM assignment WHERE id = $1 AND family_id = $2", [id, familyId]) as [{ original: AssignmentOriginal | null }];
  if (!original) throw new HttpError(409, "no_original", "This assignment has no saved original to go back to.");

  const kept: KeptField[] = [];
  let subjectId = original.subjectId;
  if (subjectId !== cur.subject_id) {
    const live = await query(tx, "SELECT 1 FROM subject WHERE id = $1 AND family_id = $2 AND archived_at IS NULL", [subjectId, familyId]);
    if (live.length === 0) { subjectId = cur.subject_id; kept.push("subject"); }
  }
  let childIds = original.childIds;
  if (!sameSet(childIds, cur.child_ids)) {
    const live = await query<{ n: number }>(tx,
      "SELECT count(*)::int AS n FROM child WHERE family_id = $1 AND archived_at IS NULL AND id = ANY($2::uuid[])", [familyId, childIds]);
    if (live[0]!.n !== childIds.length) { childIds = cur.child_ids; kept.push("children"); }
  }
  await checkDatesKeepLatestCheckIn(tx, familyId, id, original.startDate, original.endDate);

  await updateAssignment(tx, familyId, id, {
    subjectId, title: original.title, unitType: original.unitType, totalUnits: original.totalUnits, weightPerUnit: original.weightPerUnit,
    weekdays: original.weekdays, startDate: original.startDate, endDate: original.endDate, childIds,
    // The days go back to the created days with no change history: the plan is the created plan again.
    history: { weekdaysFrom: null, previousWeekdays: null },
  });
  const steps: UndoStep[] = [];
  // Like an edit, a different weight (or unit) is a choice for the children on the assignment (S2b-07).
  if (original.weightPerUnit !== cur.weight_per_unit || original.unitType !== cur.unit_type) {
    const ids = await recordWeightChoices(tx, { familyId, assignmentId: id, childIds, unitType: original.unitType, weight: original.weightPerUnit });
    if (ids.length) steps.push({ op: "weightChoices", ids });
  }
  const gone = await query<{ id: string; assignment_id: string; child_id: string | null; week_start: string; planned_units: number; mode: string; created_text: string; updated_text: string }>(tx,
    `DELETE FROM week_override WHERE family_id = $1 AND assignment_id = $2
     RETURNING id, assignment_id, child_id, week_start::text AS week_start, planned_units::float AS planned_units, mode, created_at::text AS created_text, updated_at::text AS updated_text`,
    [familyId, id]);
  for (const r of gone) {
    const set: WeekOverrideState = { assignmentId: r.assignment_id, childId: r.child_id, weekStart: r.week_start, plannedUnits: r.planned_units, mode: r.mode, createdAt: r.created_text, updatedAt: r.updated_text };
    steps.push({ op: "weekOverride", id: r.id, set });
  }
  const after = (await getAssignment(tx, familyId, id))!;
  const back = assignmentStep(cur, after);
  if (back) steps.unshift(back);
  if (steps.length) await recordUndo(tx, familyId, `Reset ${after.title}`, steps);
  return { assignment: after, kept };
}
