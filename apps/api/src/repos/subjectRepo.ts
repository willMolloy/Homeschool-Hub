import type { SubjectDefaultWeight, UnitType } from "@hh/engine";
import type { Queryable, Tx } from "../db";
import { rosterRepo, toRosterJson, type RosterJson, type RosterPatch, type RosterRow } from "./rosterRepo";

export interface SubjectRow extends RosterRow {
  /** S2b-30: both set or both NULL (subject_default_weight_pair). */
  default_weight_unit: UnitType | null;
  default_weight: number | null;
}

export interface SubjectJson extends RosterJson {
  /** S2b-31: the bar width new assignments of this unit type start from; null = none. */
  defaultWeight: SubjectDefaultWeight | null;
}

export type SubjectPatch = RosterPatch & {
  /** null clears it; undefined leaves it. */
  defaultWeight?: SubjectDefaultWeight | null;
};

export type SubjectInput = { name: string; color?: string | null; defaultWeight?: SubjectDefaultWeight | null };

const repo = rosterRepo<SubjectRow>("subject", ["default_weight_unit", "default_weight"]);

export function toSubjectJson(row: SubjectRow): SubjectJson {
  const defaultWeight = row.default_weight_unit === null || row.default_weight === null
    ? null
    : { unitType: row.default_weight_unit, weightPerUnit: Number(row.default_weight) };
  return { ...toRosterJson(row), defaultWeight };
}

/** The subject's own columns for a write; nothing when `defaultWeight` wasn't sent. */
function defaultWeightCols(d: SubjectDefaultWeight | null | undefined) {
  if (d === undefined) return {};
  return { default_weight_unit: d?.unitType ?? null, default_weight: d?.weightPerUnit ?? null };
}

export const listSubjects = (db: Queryable, familyId: string, includeArchived = false) => repo.list(db, familyId, includeArchived);
export const createSubject = (tx: Tx, familyId: string, input: SubjectInput) =>
  repo.create(tx, familyId, { name: input.name, color: input.color }, defaultWeightCols(input.defaultWeight));

/** DB index enforcing one active subject per (family, case-insensitive trimmed name). */
export const SUBJECT_NAME_INDEX = "subject_family_name_uq";
export const updateSubject = (db: Queryable, familyId: string, id: string, { defaultWeight, ...patch }: SubjectPatch) =>
  repo.update(db, familyId, id, patch, defaultWeightCols(defaultWeight));
