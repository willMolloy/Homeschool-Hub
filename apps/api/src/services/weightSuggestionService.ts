/**
 * The default weight for a new assignment (S2b-09): load the children and the subject, read each child's
 * history (`choicesFor`), and hand it to the engine (`usualWeight` → `suggestWeight`). No HTTP here.
 */
import {
  DEFAULT_WEIGHT_PER_UNIT, isLearnedUnit, suggestWeight, usualWeight,
  type SubjectDefaultWeight, type SuggestionSource, type UnitType,
} from "@hh/engine";
import type { Queryable } from "../db";
import { HttpError } from "../http/errors";
import { choicesFor } from "../repos/weightChoiceRepo";

export interface SuggestionChildJson {
  childId: string;
  name: string;
  /** null when there's no history, or the unit isn't learned. */
  usual: number | null;
  /** How many assignments fed `usual` (≤ USUAL_WEIGHT_WINDOW). */
  choices: number;
}

export interface WeightSuggestionJson {
  unitType: UnitType;
  weightPerUnit: number;
  source: SuggestionSource;
  builtInDefault: number;
  subjectDefault: SubjectDefaultWeight | null;
  learned: boolean;
  children: SuggestionChildJson[];
}

export interface SuggestionRequest {
  unitType: UnitType;
  childIds: string[];
  subjectId?: string;
}

const invalidRef = (field: string, what: string) =>
  new HttpError(400, "invalid_reference", `${field}: every id must be one of your ${what}.`);

/** The family's children by id, in request order. Archived ones count: this is a read (D8). */
async function loadChildren(db: Queryable, familyId: string, ids: string[]): Promise<{ id: string; name: string }[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<{ id: string; name: string }>(
    "SELECT id, name FROM child WHERE family_id = $1 AND id = ANY($2::uuid[])", [familyId, ids]);
  if (rows.length !== ids.length) throw invalidRef("childIds", "children");
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)!);
}

/** The subject's default weight (null if it has none); 400 if it isn't the family's. Archived is fine. */
async function loadSubjectDefault(db: Queryable, familyId: string, subjectId: string | undefined): Promise<SubjectDefaultWeight | null> {
  if (subjectId === undefined) return null;
  const { rows } = await db.query<{ u: UnitType | null; w: number | null }>(
    "SELECT default_weight_unit AS u, default_weight AS w FROM subject WHERE family_id = $1 AND id = $2", [familyId, subjectId]);
  if (rows.length === 0) throw invalidRef("subjectId", "subjects");
  const { u, w } = rows[0]!;
  return u === null || w === null ? null : { unitType: u, weightPerUnit: Number(w) };
}

export async function weightSuggestion(db: Queryable, familyId: string, req: SuggestionRequest): Promise<WeightSuggestionJson> {
  const kids = await loadChildren(db, familyId, req.childIds);
  const subjectDefault = await loadSubjectDefault(db, familyId, req.subjectId);
  const learned = isLearnedUnit(req.unitType);
  const history = isLearnedUnit(req.unitType) ? await choicesFor(db, familyId, req.childIds, req.unitType) : [];
  const children = kids.map((k): SuggestionChildJson => {
    const mine = history.filter((c) => c.childId === k.id);
    return { childId: k.id, name: k.name, usual: usualWeight(mine), choices: mine.length };
  });
  const s = suggestWeight({ unitType: req.unitType, perChild: children.map((c) => ({ childId: c.childId, usual: c.usual })), subjectDefault });
  return {
    unitType: req.unitType,
    weightPerUnit: s.weight,
    source: s.source,
    builtInDefault: DEFAULT_WEIGHT_PER_UNIT[req.unitType],
    subjectDefault,
    learned,
    children,
  };
}
