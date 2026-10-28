import type { Assignment, UnitType } from "./types";

/**
 * The weight model (S2b-01). An assignment has a relative weight per unit (effort per page,
 * chapter, lesson or minute); bar thickness = units per day × weight. Thickness has no unit.
 * D1: 2 minutes = 1 point, so a page at weight 1 is about 2 minutes.
 */
export const MINUTES_PER_WEIGHT_POINT = 2;

/** Built-in weights, used when neither the assignment nor its subject sets one. */
export const DEFAULT_WEIGHT_PER_UNIT: Readonly<Record<UnitType, number>> = Object.freeze({
  pages: 1,
  chapters: 10,
  lessons: 15,
  // 30 minutes = 15 points = 30 pages' worth of time at weight 1.
  minutes: 1 / MINUTES_PER_WEIGHT_POINT,
});

/** Count-based units where a child's history means something (D17: chapters included). */
export const LEARNED_UNIT_TYPES = ["pages", "chapters"] as const;
export type LearnedUnitType = (typeof LEARNED_UNIT_TYPES)[number];

/** D2. The single source for the API, DB CHECKs and web. */
export const MIN_WEIGHT_PER_UNIT = 0.01;
export const MAX_WEIGHT_PER_UNIT = 100;
export const WEIGHT_DECIMALS = 2;

export type WeightSource = "assignment" | "subject" | "default";

/** A subject's default bar width, bound to one unit type (D23). */
export interface SubjectDefaultWeight {
  unitType: UnitType;
  weightPerUnit: number;
}

/** Finite, within [MIN, MAX], and at most WEIGHT_DECIMALS decimals. */
export function isValidWeight(n: unknown): n is number {
  if (typeof n !== "number" || !Number.isFinite(n)) return false;
  if (n < MIN_WEIGHT_PER_UNIT || n > MAX_WEIGHT_PER_UNIT) return false;
  const scale = 10 ** WEIGHT_DECIMALS;
  return Math.abs(Math.round(n * scale) - n * scale) < 1e-6;
}

export function isLearnedUnit(u: UnitType): u is LearnedUnitType {
  return (LEARNED_UNIT_TYPES as readonly UnitType[]).includes(u);
}

/**
 * Resolve an assignment's weight: its own valid value, else a valid subject default for the same
 * unit type, else the built-in. Never throws on bad stored values (the API keeps them out).
 */
export function weightPerUnitOf(
  a: Pick<Assignment, "unitType" | "weightPerUnit">,
  subjectDefault?: SubjectDefaultWeight | null,
): { weight: number; source: WeightSource } {
  if (isValidWeight(a.weightPerUnit)) return { weight: a.weightPerUnit, source: "assignment" };
  if (subjectDefault && subjectDefault.unitType === a.unitType && isValidWeight(subjectDefault.weightPerUnit)) {
    return { weight: subjectDefault.weightPerUnit, source: "subject" };
  }
  return { weight: DEFAULT_WEIGHT_PER_UNIT[a.unitType], source: "default" };
}
