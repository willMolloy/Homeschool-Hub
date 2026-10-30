/**
 * Assignments and their children (S2a-04..06). Every query is scoped by family_id.
 * Archive instead of delete: progress logs reference assignments.
 */
import type { UnitType } from "@hh/engine";
import type { Queryable, Tx } from "../db";
import { buildUpdateSet, replaceLinks } from "./sql";

export interface AssignmentRow {
  id: string;
  subject_id: string;
  title: string;
  unit_type: UnitType;
  total_units: number;
  weight_per_unit: number | null;
  /** S4-02: the days it is worked on; null = follow the subject's default, then every school day. */
  weekdays: number[] | null;
  /** S4-01b: the date the current days apply from, and the days before (null = every school day); both null without a change. */
  weekdays_from: string | null;
  previous_weekdays: number[] | null;
  start_date: string;
  end_date: string;
  archived_at: Date | null;
  child_ids: string[];
}

export interface AssignmentJson {
  id: string;
  subjectId: string;
  title: string;
  unitType: UnitType;
  totalUnits: number;
  /** Relative weight per unit (bar thickness = units × weight); null = the subject default, then the built-in. */
  weightPerUnit: number | null;
  /** S4-04: its own days (sorted, 0 = Sunday); null = follows the subject's default, then every school day. */
  weekdays: number[] | null;
  startDate: string;
  endDate: string;
  childIds: string[];
  archived: boolean;
}

export function toAssignmentJson(r: AssignmentRow): AssignmentJson {
  return {
    id: r.id, subjectId: r.subject_id, title: r.title, unitType: r.unit_type, totalUnits: r.total_units,
    weightPerUnit: r.weight_per_unit, weekdays: r.weekdays ? [...r.weekdays].sort((x, y) => x - y) : null, startDate: r.start_date, endDate: r.end_date, childIds: r.child_ids,
    archived: r.archived_at !== null,
  };
}

// Children in roster order, so the UI lists them the same way everywhere.
const SELECT = `
  SELECT a.id, a.subject_id, a.title, a.unit_type, a.total_units, a.weight_per_unit, a.weekdays, a.weekdays_from, a.previous_weekdays, a.start_date, a.end_date, a.archived_at,
         COALESCE((SELECT array_agg(ac.child_id ORDER BY c.sort_order, c.id)
                     FROM assignment_child ac JOIN child c ON c.id = ac.child_id
                    WHERE ac.assignment_id = a.id), '{}') AS child_ids
    FROM assignment a`;

/** The family's assignments by start date, title, id. Archived ones only when asked. */
export async function listAssignments(db: Queryable, familyId: string, includeArchived = false): Promise<AssignmentRow[]> {
  const { rows } = await db.query<AssignmentRow>(
    `${SELECT} WHERE a.family_id = $1 AND ($2::boolean OR a.archived_at IS NULL)
      ORDER BY a.start_date, lower(a.title), a.id`, [familyId, includeArchived]);
  return rows;
}

/** One of the family's assignments (archived or not), or null. */
export async function getAssignment(db: Queryable, familyId: string, id: string): Promise<AssignmentRow | null> {
  const { rows } = await db.query<AssignmentRow>(`${SELECT} WHERE a.family_id = $1 AND a.id = $2`, [familyId, id]);
  return rows[0] ?? null;
}

export interface AssignmentInput {
  subjectId: string;
  title: string;
  unitType: UnitType;
  totalUnits: number;
  weightPerUnit: number | null;
  weekdays?: number[] | null;
  startDate: string;
  endDate: string;
  childIds: string[];
}

/** Insert an assignment and its children. References must already be checked. */
export async function createAssignment(tx: Tx, familyId: string, a: AssignmentInput): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, weight_per_unit, start_date, end_date, weekdays)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [familyId, a.subjectId, a.title, a.unitType, a.totalUnits, a.weightPerUnit, a.startDate, a.endDate, a.weekdays ?? null]);
  const id = rows[0]!.id;
  await replaceLinks(tx, "assignment_child", { ownerId: id, familyId, childIds: a.childIds });
  return id;
}

/** `history` (S4-01b) is written with a weekday change: the date the new days apply from and the days before. */
export type AssignmentPatch = Partial<AssignmentInput> & { archived?: boolean; history?: { weekdaysFrom: string | null; previousWeekdays: number[] | null } };

/** Lock one of the family's assignments for update and return it, or null. */
export async function lockAssignment(tx: Tx, familyId: string, id: string): Promise<AssignmentRow | null> {
  const { rowCount } = await tx.query("SELECT 1 FROM assignment WHERE id = $1 AND family_id = $2 FOR UPDATE", [id, familyId]);
  return rowCount ? getAssignment(tx, familyId, id) : null;
}

/** Apply the given fields (and replace children when `childIds` is sent). */
export async function updateAssignment(tx: Tx, familyId: string, id: string, p: AssignmentPatch): Promise<void> {
  const { set, params } = buildUpdateSet({
    subject_id: p.subjectId, title: p.title, unit_type: p.unitType, total_units: p.totalUnits,
    weight_per_unit: p.weightPerUnit, start_date: p.startDate, end_date: p.endDate,
    weekdays: p.weekdays, weekdays_from: p.history?.weekdaysFrom, previous_weekdays: p.history?.previousWeekdays,
  }, { firstParam: 3, archived: p.archived });
  await tx.query(`UPDATE assignment SET ${set} WHERE id = $1 AND family_id = $2`, [id, familyId, ...params]);
  if (p.childIds) await replaceLinks(tx, "assignment_child", { ownerId: id, familyId, childIds: p.childIds });
}

/**
 * S4-01b: a subject's default weekdays changed (to `after`, sorted). Each of its active assignments that follows the default
 * (no weekdays of its own) and started before `weekdaysFrom` keeps its plan up to then: it records the date and the days before.
 * S4b-02: one that already has a record from this same week keeps its earlier `previous_weekdays`; if the new days equal
 * them the record is cleared (the change is undone).
 */
export async function recordSubjectWeekdaysChange(
  tx: Tx, familyId: string, subjectId: string, change: { weekdaysFrom: string; previousWeekdays: number[] | null; after: number[] | null },
): Promise<void> {
  const undone = "weekdays_from = $3 AND previous_weekdays IS NOT DISTINCT FROM $5::smallint[]";
  await tx.query(
    `UPDATE assignment SET
            weekdays_from = CASE WHEN ${undone} THEN NULL ELSE $3 END,
            previous_weekdays = CASE WHEN ${undone} THEN NULL WHEN weekdays_from = $3 THEN previous_weekdays ELSE $4::smallint[] END,
            updated_at = now()
      WHERE family_id = $1 AND subject_id = $2 AND weekdays IS NULL AND archived_at IS NULL AND start_date < $3`,
    [familyId, subjectId, change.weekdaysFrom, change.previousWeekdays, change.after]);
}
