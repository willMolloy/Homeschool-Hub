import type { SubjectDefaultWeight, UnitType } from "@hh/engine";
import type { Queryable, Tx } from "../db";
import { rosterRepo, toRosterJson, type RosterJson, type RosterPatch, type RosterRow } from "./rosterRepo";

export interface SubjectRow extends RosterRow {
  /** S2b-30: both set or both NULL (subject_default_weight_pair). */
  default_weight_unit: UnitType | null;
  default_weight: number | null;
  /** S4-02: NULL = none; assignments without their own weekdays then run on every school day. */
  default_weekdays: number[] | null;
}

export interface SubjectJson extends RosterJson {
  /** S2b-31: the bar width new assignments of this unit type start from; null = none. */
  defaultWeight: SubjectDefaultWeight | null;
  /** S4-03: the days new assignments of this subject start from (sorted, 0 = Sunday); null = every school day. */
  defaultWeekdays: number[] | null;
}

export type SubjectPatch = RosterPatch & {
  /** null clears it; undefined leaves it. */
  defaultWeight?: SubjectDefaultWeight | null;
  defaultWeekdays?: number[] | null;
};

export type SubjectInput = { name: string; color?: string | null; defaultWeight?: SubjectDefaultWeight | null; defaultWeekdays?: number[] | null };

const repo = rosterRepo<SubjectRow>("subject", ["default_weight_unit", "default_weight", "default_weekdays"]);

export function toSubjectJson(row: SubjectRow): SubjectJson {
  const defaultWeight = row.default_weight_unit === null || row.default_weight === null
    ? null
    : { unitType: row.default_weight_unit, weightPerUnit: Number(row.default_weight) };
  return { ...toRosterJson(row), defaultWeight, defaultWeekdays: row.default_weekdays ? [...row.default_weekdays].sort((a, b) => a - b) : null };
}

/** The subject's own columns for a write; nothing when `defaultWeight` wasn't sent. */
function defaultWeightCols(d: SubjectDefaultWeight | null | undefined) {
  if (d === undefined) return {};
  return { default_weight_unit: d?.unitType ?? null, default_weight: d?.weightPerUnit ?? null };
}

export const listSubjects = (db: Queryable, familyId: string, includeArchived = false) => repo.list(db, familyId, includeArchived);
export const createSubject = (tx: Tx, familyId: string, input: SubjectInput) =>
  repo.create(tx, familyId, { name: input.name, color: input.color }, { ...defaultWeightCols(input.defaultWeight), default_weekdays: input.defaultWeekdays });

/** DB index enforcing one active subject per (family, case-insensitive trimmed name). */
export const SUBJECT_NAME_INDEX = "subject_family_name_uq";
export const updateSubject = (db: Queryable, familyId: string, id: string, { defaultWeight, defaultWeekdays, ...patch }: SubjectPatch) =>
  repo.update(db, familyId, id, patch, { ...defaultWeightCols(defaultWeight), default_weekdays: defaultWeekdays });

/** Lock one of the family's subjects and return its current default weekdays; undefined when there is no such subject. */
export async function lockSubjectWeekdays(tx: Tx, familyId: string, id: string): Promise<number[] | null | undefined> {
  const { rows } = await tx.query<{ default_weekdays: number[] | null }>(
    "SELECT default_weekdays FROM subject WHERE id = $1 AND family_id = $2 FOR UPDATE", [id, familyId]);
  return rows[0] ? rows[0].default_weekdays : undefined;
}
