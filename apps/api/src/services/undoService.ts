/**
 * Undo the last change (S6-06, decision C2). A family has one `undo_entry`: a label to show and the inverse of its last
 * plan change, as a list of steps. Each undoable write records it in its own transaction (`recordUndo`); `applyUndo` runs
 * the steps in one transaction and removes the entry (one step, no redo; the undo itself is not recorded).
 * A step says what to put back: `set` is the state to restore, or `null` for "this row should not exist".
 */
import type { UnitType } from "@hh/engine";
import { query, withTransaction, type Db, type Queryable, type Tx } from "../db";
import { HttpError } from "../http/errors";
import { checkDatesKeepLatestCheckIn } from "../http/checkInDates";
import { lockAssignment, updateAssignment, type AssignmentRow } from "../repos/assignmentRepo";
import { replaceLinks } from "../repos/sql";

export interface AssignmentState {
  subjectId: string; title: string; unitType: UnitType; totalUnits: number; weightPerUnit: number | null;
  weekdays: number[] | null; weekdaysFrom: string | null; previousWeekdays: number[] | null;
  startDate: string; endDate: string; archived: boolean; childIds: string[];
}
export interface BlockedRangeState { label: string | null; kind: string; startDate: string; endDate: string; childIds: string[] }
export interface WeekOverrideState {
  assignmentId: string; childId: string | null; weekStart: string; plannedUnits: number; mode: string; createdAt: string; updatedAt: string;
}

export type UndoStep =
  | { op: "assignment"; id: string; set: AssignmentState }
  | { op: "blockedRange"; id: string; set: BlockedRangeState | null }
  | { op: "weekOverride"; id: string; set: WeekOverrideState | null }
  /** weight_choice rows the change appended (S2b-07), taken back so an undone nudge doesn't steer the next suggestion. */
  | { op: "weightChoices"; ids: string[] };

export const assignmentState = (r: AssignmentRow): AssignmentState => ({
  subjectId: r.subject_id, title: r.title, unitType: r.unit_type, totalUnits: r.total_units, weightPerUnit: r.weight_per_unit,
  weekdays: r.weekdays, weekdaysFrom: r.weekdays_from, previousWeekdays: r.previous_weekdays,
  startDate: r.start_date, endDate: r.end_date, archived: r.archived_at !== null, childIds: r.child_ids,
});

/** The assignment as it stands, as a step; null when nothing differs from `before` (a no-op edit isn't worth an undo). */
export function assignmentStep(before: AssignmentRow, after: AssignmentRow): UndoStep | null {
  const b = assignmentState(before);
  return JSON.stringify(b) === JSON.stringify(assignmentState(after)) ? null : { op: "assignment", id: before.id, set: b };
}

const trim = (s: string) => (s.length > 300 ? `${s.slice(0, 299)}…` : s);

/** Record `steps` as the family's one undo entry, replacing any earlier one. Call inside the change's transaction. */
export async function recordUndo(tx: Tx, familyId: string, label: string, steps: UndoStep[]): Promise<void> {
  await tx.query(
    `INSERT INTO undo_entry (family_id, label, inverse) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (family_id) DO UPDATE SET label = EXCLUDED.label, inverse = EXCLUDED.inverse, created_at = now()`,
    [familyId, trim(label), JSON.stringify({ steps })]);
}

/** The family's undoable change, or null. */
export async function getUndo(db: Queryable, familyId: string): Promise<{ label: string; createdAt: string } | null> {
  const [e] = await query<{ label: string; created_at: Date }>(db, "SELECT label, created_at FROM undo_entry WHERE family_id = $1", [familyId]);
  return e ? { label: e.label, createdAt: e.created_at.toISOString() } : null;
}

/** The inverse no longer fits the data. */
class Stale extends Error {}

async function applyStep(tx: Tx, familyId: string, step: UndoStep): Promise<void> {
  switch (step.op) {
    case "assignment": {
      const cur = await lockAssignment(tx, familyId, step.id);
      if (!cur) throw new Stale();
      const s = step.set;
      if (s.startDate !== cur.start_date || s.endDate !== cur.end_date) await checkDatesKeepLatestCheckIn(tx, familyId, step.id, s.startDate, s.endDate);
      await updateAssignment(tx, familyId, step.id, {
        subjectId: s.subjectId, title: s.title, unitType: s.unitType, totalUnits: s.totalUnits, weightPerUnit: s.weightPerUnit,
        weekdays: s.weekdays, startDate: s.startDate, endDate: s.endDate, childIds: s.childIds, archived: s.archived,
        history: { weekdaysFrom: s.weekdaysFrom, previousWeekdays: s.previousWeekdays },
      });
      return;
    }
    case "blockedRange": {
      if (step.set === null) {
        const { rowCount } = await tx.query("DELETE FROM blocked_range WHERE id = $1 AND family_id = $2", [step.id, familyId]);
        if (!rowCount) throw new Stale();
        return;
      }
      const s = step.set;
      await tx.query(
        `INSERT INTO blocked_range (id, family_id, label, kind, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, kind = EXCLUDED.kind, start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date, updated_at = now() WHERE blocked_range.family_id = EXCLUDED.family_id`,
        [step.id, familyId, s.label, s.kind, s.startDate, s.endDate]);
      await replaceLinks(tx, "blocked_range_child", { ownerId: step.id, familyId, childIds: s.childIds });
      return;
    }
    case "weekOverride": {
      if (step.set === null) {
        const { rowCount } = await tx.query("DELETE FROM week_override WHERE id = $1 AND family_id = $2", [step.id, familyId]);
        if (!rowCount) throw new Stale();
        return;
      }
      const s = step.set;
      // The old updated_at goes back too: it is the edit order the plan reads (S6-01).
      await tx.query(
        `INSERT INTO week_override (id, family_id, assignment_id, child_id, week_start, planned_units, mode, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET planned_units = EXCLUDED.planned_units, mode = EXCLUDED.mode, updated_at = EXCLUDED.updated_at
           WHERE week_override.family_id = EXCLUDED.family_id`,
        [step.id, familyId, s.assignmentId, s.childId, s.weekStart, s.plannedUnits, s.mode, s.createdAt, s.updatedAt]);
      return;
    }
    case "weightChoices":
      await tx.query("DELETE FROM weight_choice WHERE family_id = $1 AND id = ANY($2::bigint[])", [familyId, step.ids]);
      return;
    default:
      throw new Stale();
  }
}

const isStale = (err: unknown) =>
  err instanceof Stale
  || (err instanceof HttpError && err.code === "check_in_outside")
  || (typeof err === "object" && err !== null && /^23/.test(String((err as { code?: unknown }).code ?? "")));

/**
 * Apply the family's inverse and remove the entry, in one transaction. 404 when there is nothing to undo; 409 (and the entry
 * is dropped) when the inverse no longer applies, e.g. the row it restores is gone or a check-in now pins the dates.
 */
export async function applyUndo(db: Db, familyId: string): Promise<{ label: string }> {
  try {
    return await withTransaction(db, async (tx) => {
      const [e] = await query<{ label: string; inverse: { steps?: UndoStep[] } }>(tx, "SELECT label, inverse FROM undo_entry WHERE family_id = $1 FOR UPDATE", [familyId]);
      if (!e) throw new HttpError(404, "not_found", "Nothing to undo.");
      for (const step of e.inverse.steps ?? []) await applyStep(tx, familyId, step);
      await tx.query("DELETE FROM undo_entry WHERE family_id = $1", [familyId]);
      return { label: e.label };
    });
  } catch (err) {
    if (!isStale(err)) throw err;
    await query(db, "DELETE FROM undo_entry WHERE family_id = $1", [familyId]);
    throw new HttpError(409, "cannot_undo", "That change can't be undone any more.");
  }
}

