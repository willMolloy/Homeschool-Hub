/**
 * Assignments and their children (S2a-04..06). Every query is scoped by family_id.
 * Archive instead of delete: progress logs reference assignments.
 */
import type { UnitType } from "@hh/engine";
import type { Queryable, Tx } from "../db";
import { buildUpdateSet } from "./sql";

export interface AssignmentRow {
  id: string;
  subject_id: string;
  title: string;
  unit_type: UnitType;
  total_units: number;
  weight_per_unit: number | null;
  /** S20-01 / M1: the minutes a day the parent entered. Null unless the unit is minutes. */
  minutes_per_day: number | null;
  /** S4-02: the days it is worked on; null = follow the subject's default, then every school day. */
  weekdays: number[] | null;
  /** S4-01b: the date the current days apply from, and the days before (null = every school day); both null without a change. */
  weekdays_from: string | null;
  previous_weekdays: number[] | null;
  start_date: string;
  end_date: string;
  archived_at: Date | null;
  /** S12-01: how the parent said it ended, and the day; both null while it is open. */
  ended_as: EndedAs | null;
  ended_on: string | null;
  child_ids: string[];
  /** S22-01: each child's own end and ending. Copied from the book until a parent changes one child. */
  children: ChildSchedule[];
}

export type EndedAs = "finished" | "stopped";

/** S22-01: one child's planned end and how that child finished or stopped. */
export interface ChildSchedule {
  childId: string;
  endDate: string;
  endedAs: EndedAs | null;
  endedOn: string | null;
}

export interface AssignmentJson {
  id: string;
  subjectId: string;
  title: string;
  unitType: UnitType;
  totalUnits: number;
  /** Relative weight per unit (bar thickness = units × weight); null = the subject default, then the built-in. */
  weightPerUnit: number | null;
  /** S20-01 / M1: minutes a day, when the unit is minutes. Null for every other unit. */
  minutesPerDay: number | null;
  /** S4-04: its own days (sorted, 0 = Sunday); null = follows the subject's default, then every school day. */
  weekdays: number[] | null;
  startDate: string;
  endDate: string;
  childIds: string[];
  archived: boolean;
  /** S12-01: how the parent said it ended ("finished" or "stopped"), and the day; both null while it is open. */
  endedAs: EndedAs | null;
  endedOn: string | null;
  /** S22-01: each child's end and ending, in roster order. While they match, they repeat the book. */
  children: ChildSchedule[];
}

export function toAssignmentJson(r: AssignmentRow): AssignmentJson {
  return {
    id: r.id, subjectId: r.subject_id, title: r.title, unitType: r.unit_type, totalUnits: r.total_units,
    weightPerUnit: r.weight_per_unit, minutesPerDay: r.minutes_per_day, weekdays: r.weekdays ? [...r.weekdays].sort((x, y) => x - y) : null, startDate: r.start_date, endDate: r.end_date, childIds: r.child_ids,
    archived: r.archived_at !== null, endedAs: r.ended_as, endedOn: r.ended_on, children: r.children ?? [],
  };
}

// Children in roster order, so the UI lists them the same way everywhere.
const SELECT = `
  SELECT a.id, a.subject_id, a.title, a.unit_type, a.total_units, a.weight_per_unit, a.minutes_per_day, a.weekdays, a.weekdays_from, a.previous_weekdays, a.start_date, a.end_date, a.archived_at, a.ended_as, a.ended_on,
         COALESCE((SELECT array_agg(ac.child_id ORDER BY c.sort_order, c.id)
                     FROM assignment_child ac JOIN child c ON c.id = ac.child_id
                    WHERE ac.assignment_id = a.id), '{}') AS child_ids,
         COALESCE((SELECT json_agg(json_build_object(
                     'childId', ac.child_id,
                     'endDate', to_char(ac.end_date, 'YYYY-MM-DD'),
                     'endedAs', ac.ended_as,
                     'endedOn', to_char(ac.ended_on, 'YYYY-MM-DD')) ORDER BY c.sort_order, c.id)
                     FROM assignment_child ac JOIN child c ON c.id = ac.child_id
                    WHERE ac.assignment_id = a.id), '[]'::json) AS children
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
  /** Set for a minutes assignment: the minutes a day. Null clears it (any other unit). */
  minutesPerDay?: number | null;
  weekdays?: number[] | null;
  startDate: string;
  endDate: string;
  childIds: string[];
}

/** S6-05: an assignment's values as created, kept in `assignment.original` for reset (S6-07). */
export interface AssignmentOriginal {
  title: string;
  subjectId: string;
  unitType: UnitType;
  totalUnits: number;
  weightPerUnit: number | null;
  minutesPerDay?: number | null;
  weekdays: number[] | null;
  startDate: string;
  endDate: string;
  childIds: string[];
}

const originalOf = (a: AssignmentInput): AssignmentOriginal => ({
  title: a.title, subjectId: a.subjectId, unitType: a.unitType, totalUnits: a.totalUnits, weightPerUnit: a.weightPerUnit,
  minutesPerDay: a.unitType === "minutes" ? a.minutesPerDay ?? null : null,
  weekdays: a.weekdays ?? null, startDate: a.startDate, endDate: a.endDate, childIds: a.childIds,
});

/** Insert an assignment and its children, and keep its created values as `original` (S6-05). References must already be checked. */
export async function createAssignment(tx: Tx, familyId: string, a: AssignmentInput): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, weight_per_unit, minutes_per_day, start_date, end_date, weekdays, original)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING id`,
    [familyId, a.subjectId, a.title, a.unitType, a.totalUnits, a.weightPerUnit, a.unitType === "minutes" ? a.minutesPerDay ?? null : null, a.startDate, a.endDate, a.weekdays ?? null, JSON.stringify(originalOf(a))]);
  const id = rows[0]!.id;
  await replaceAssignmentChildren(tx, familyId, id, a.childIds, { endDate: a.endDate, endedAs: null, endedOn: null });
  await syncAssignmentSummary(tx, familyId, id);
  return id;
}

/** S22-03: one child's end or ending. Absent fields stay as they are. `endedAs: null` reopens that child. */
export interface ChildEndPatch {
  childId: string;
  endDate?: string;
  endedAs?: EndedAs | null;
  endedOn?: string | null;
}

/** `history` (S4-01b) is written with a weekday change: the date the new days apply from and the days before. */
export type AssignmentPatch = Partial<AssignmentInput> & {
  archived?: boolean;
  endedAs?: EndedAs | null;
  endedOn?: string | null;
  history?: { weekdaysFrom: string | null; previousWeekdays: number[] | null };
  /** S22-03: these children only. When set, an end or ending on the patch is not copied onto everyone. */
  childEnds?: ChildEndPatch[];
};

/** Lock one of the family's assignments for update and return it, or null. */
export async function lockAssignment(tx: Tx, familyId: string, id: string): Promise<AssignmentRow | null> {
  const { rowCount } = await tx.query("SELECT 1 FROM assignment WHERE id = $1 AND family_id = $2 FOR UPDATE", [id, familyId]);
  return rowCount ? getAssignment(tx, familyId, id) : null;
}

/**
 * Apply the given fields (and replace children when `childIds` is sent).
 * An end or an ending sent here is for every child (S22-01). A later ticket names one child.
 * The book's stored end is then the latest child's end, and its ending is stored only when every child shares it.
 */
export async function updateAssignment(tx: Tx, familyId: string, id: string, p: AssignmentPatch): Promise<void> {
  const { set, params } = buildUpdateSet({
    subject_id: p.subjectId, title: p.title, unit_type: p.unitType, total_units: p.totalUnits,
    weight_per_unit: p.weightPerUnit, minutes_per_day: p.minutesPerDay, start_date: p.startDate, end_date: p.endDate,
    weekdays: p.weekdays, weekdays_from: p.history?.weekdaysFrom, previous_weekdays: p.history?.previousWeekdays,
    ended_as: p.endedAs, ended_on: p.endedOn,
  }, { firstParam: 3, archived: p.archived });
  await tx.query(`UPDATE assignment SET ${set} WHERE id = $1 AND family_id = $2`, [id, familyId, ...params]);
  if (p.childIds) {
    const [book] = (await tx.query<{ end_date: string; ended_as: EndedAs | null; ended_on: string | null }>(
      "SELECT end_date::text, ended_as, ended_on::text FROM assignment WHERE id = $1 AND family_id = $2",
      [id, familyId],
    )).rows;
    await replaceAssignmentChildren(tx, familyId, id, p.childIds, {
      endDate: book!.end_date, endedAs: book!.ended_as, endedOn: book!.ended_on,
    });
  }
  if (p.childEnds?.length) {
    for (const row of p.childEnds) await writeChildEnd(tx, familyId, id, row);
  } else {
    if (p.endDate !== undefined) {
      await tx.query("UPDATE assignment_child SET end_date = $3 WHERE assignment_id = $1 AND family_id = $2", [id, familyId, p.endDate]);
    }
    if (p.endedAs !== undefined || p.endedOn !== undefined) {
      await tx.query(
        `UPDATE assignment_child ac SET ended_as = a.ended_as, ended_on = a.ended_on
           FROM assignment a
          WHERE ac.assignment_id = a.id AND ac.family_id = a.family_id AND a.id = $1 AND a.family_id = $2`,
        [id, familyId],
      );
    }
  }
  await syncAssignmentSummary(tx, familyId, id);
}

/** One child's end or ending. A child who is not on the book is left unmatched (the route refuses that first). */
async function writeChildEnd(tx: Tx, familyId: string, assignmentId: string, row: ChildEndPatch): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [assignmentId, familyId, row.childId];
  if (row.endDate !== undefined) {
    params.push(row.endDate);
    sets.push(`end_date = $${params.length}`);
  }
  if (row.endedAs !== undefined) {
    params.push(row.endedAs);
    sets.push(`ended_as = $${params.length}`);
    params.push(row.endedOn ?? null);
    sets.push(`ended_on = $${params.length}`);
  }
  if (sets.length === 0) return;
  await tx.query(
    `UPDATE assignment_child SET ${sets.join(", ")} WHERE assignment_id = $1 AND family_id = $2 AND child_id = $3`,
    params,
  );
}

/** Keep the children who stay, and give a newly added child the book's current end and ending. */
async function replaceAssignmentChildren(
  tx: Tx, familyId: string, assignmentId: string, childIds: readonly string[],
  fresh: { endDate: string; endedAs: EndedAs | null; endedOn: string | null },
): Promise<void> {
  await tx.query(
    "DELETE FROM assignment_child WHERE assignment_id = $1 AND family_id = $2 AND NOT (child_id = ANY($3::uuid[]))",
    [assignmentId, familyId, childIds],
  );
  if (childIds.length === 0) return;
  await tx.query(
    `INSERT INTO assignment_child (assignment_id, child_id, family_id, end_date, ended_as, ended_on)
     SELECT $1, c, $2, $4::date, $5, $6::date
       FROM unnest($3::uuid[]) AS c
      WHERE NOT EXISTS (
        SELECT 1 FROM assignment_child ac WHERE ac.assignment_id = $1 AND ac.child_id = c AND ac.family_id = $2)`,
    [assignmentId, familyId, childIds, fresh.endDate, fresh.endedAs, fresh.endedOn],
  );
}

/** The book's end is the latest child's end. Its ending is stored only when every child shares one. */
async function syncAssignmentSummary(tx: Tx, familyId: string, assignmentId: string): Promise<void> {
  await tx.query(
    `UPDATE assignment a SET
        end_date = s.end_date,
        ended_as = s.ended_as,
        ended_on = s.ended_on
       FROM (
         SELECT MAX(end_date) AS end_date,
                CASE WHEN COUNT(DISTINCT (COALESCE(ended_as, '') || '|' || COALESCE(ended_on::text, ''))) = 1
                     THEN MIN(ended_as) ELSE NULL END AS ended_as,
                CASE WHEN COUNT(DISTINCT (COALESCE(ended_as, '') || '|' || COALESCE(ended_on::text, ''))) = 1
                     THEN MIN(ended_on) ELSE NULL END AS ended_on
           FROM assignment_child
          WHERE assignment_id = $1 AND family_id = $2
       ) s
      WHERE a.id = $1 AND a.family_id = $2
        AND EXISTS (SELECT 1 FROM assignment_child WHERE assignment_id = $1 AND family_id = $2)`,
    [assignmentId, familyId],
  );
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
