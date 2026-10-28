/**
 * Assignments and their children (S2a-04..06). Every query is scoped by family_id.
 * Archive instead of delete: progress logs reference assignments.
 */
import type { UnitType } from "@hh/engine";
import type { Queryable } from "../db";

export interface AssignmentRow {
  id: string;
  subject_id: string;
  title: string;
  unit_type: UnitType;
  total_units: number;
  minutes_per_unit: number | null;
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
  /** null = use the unit-type default (the UI shows it as estimated). */
  minutesPerUnit: number | null;
  startDate: string;
  endDate: string;
  childIds: string[];
  archived: boolean;
}

export function toAssignmentJson(r: AssignmentRow): AssignmentJson {
  return {
    id: r.id, subjectId: r.subject_id, title: r.title, unitType: r.unit_type, totalUnits: r.total_units,
    minutesPerUnit: r.minutes_per_unit, startDate: r.start_date, endDate: r.end_date, childIds: r.child_ids,
    archived: r.archived_at !== null,
  };
}

// Children in roster order, so the UI lists them the same way everywhere.
const SELECT = `
  SELECT a.id, a.subject_id, a.title, a.unit_type, a.total_units, a.minutes_per_unit, a.start_date, a.end_date, a.archived_at,
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
  minutesPerUnit: number | null;
  startDate: string;
  endDate: string;
  childIds: string[];
}

async function setChildren(db: Queryable, familyId: string, id: string, childIds: string[]): Promise<void> {
  await db.query("DELETE FROM assignment_child WHERE assignment_id = $1 AND family_id = $2", [id, familyId]);
  await db.query(
    "INSERT INTO assignment_child (assignment_id, child_id, family_id) SELECT $1, unnest($2::uuid[]), $3", [id, childIds, familyId]);
}

/** Insert an assignment and its children. Call inside a transaction; references must already be checked. */
export async function createAssignment(db: Queryable, familyId: string, a: AssignmentInput): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, minutes_per_unit, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [familyId, a.subjectId, a.title, a.unitType, a.totalUnits, a.minutesPerUnit, a.startDate, a.endDate]);
  const id = rows[0]!.id;
  await setChildren(db, familyId, id, a.childIds);
  return id;
}

export type AssignmentPatch = Partial<AssignmentInput> & { archived?: boolean };

/** Lock one of the family's assignments for update and return it, or null. Call inside a transaction. */
export async function lockAssignment(db: Queryable, familyId: string, id: string): Promise<AssignmentRow | null> {
  const { rowCount } = await db.query("SELECT 1 FROM assignment WHERE id = $1 AND family_id = $2 FOR UPDATE", [id, familyId]);
  return rowCount ? getAssignment(db, familyId, id) : null;
}

/** Apply the given fields (and replace children when `childIds` is sent). Call inside a transaction. */
export async function updateAssignment(db: Queryable, familyId: string, id: string, p: AssignmentPatch): Promise<void> {
  const cols: Record<string, unknown> = {
    subject_id: p.subjectId, title: p.title, unit_type: p.unitType, total_units: p.totalUnits,
    minutes_per_unit: p.minutesPerUnit, start_date: p.startDate, end_date: p.endDate,
  };
  const sets: string[] = [];
  const params: unknown[] = [id, familyId];
  for (const [col, v] of Object.entries(cols)) {
    if (v === undefined) continue;
    params.push(v);
    sets.push(`${col} = $${params.length}`);
  }
  if (p.archived !== undefined) sets.push(p.archived ? "archived_at = COALESCE(archived_at, now())" : "archived_at = NULL");
  sets.push("updated_at = now()");
  await db.query(`UPDATE assignment SET ${sets.join(", ")} WHERE id = $1 AND family_id = $2`, params);
  if (p.childIds) await setChildren(db, familyId, id, p.childIds);
}
