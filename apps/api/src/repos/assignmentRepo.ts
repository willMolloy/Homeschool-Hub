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
