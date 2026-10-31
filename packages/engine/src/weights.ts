import { EngineInputError } from "./dates";
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

// ---- A child's usual weight (S2b-08, D5/D6/D18) ----

/** With this many values or more, the single highest and lowest are dropped before averaging. */
export const TRIM_MIN_COUNT = 4;
/** How many of a child's most recent assignments count toward their usual weight. */
export const USUAL_WEIGHT_WINDOW = 5;

/** One row of weight_choice history for one child and unit type. */
export interface WeightChoice {
  assignmentId: string;
  /** null = the parent cleared the weight back to the default. */
  weight: number | null;
  chosenAt: string;
  id: number;
}

/** Round to WEIGHT_DECIMALS, half away from zero, tolerant of binary noise (1.005 → 1.01). */
export function roundWeight(n: number): number {
  const scale = 10 ** WEIGHT_DECIMALS;
  const abs = Math.round(Math.abs(n) * scale * (1 + Number.EPSILON * 4) + 1e-9) / scale;
  return n < 0 ? -abs : abs;
}

/** Newer first: by chosenAt, then id. */
function newerFirst(a: WeightChoice, b: WeightChoice): number {
  return Date.parse(b.chosenAt) - Date.parse(a.chosenAt) || b.id - a.id;
}

/** Mean of the values, trimmed of one high and one low once there are TRIM_MIN_COUNT or more. */
function trimmedMean(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const kept = sorted.length >= TRIM_MIN_COUNT ? sorted.slice(1, -1) : sorted;
  return kept.reduce((s, v) => s + v, 0) / kept.length;
}

/**
 * A child's usual weight for one unit type: the latest choice per assignment, minus cleared ones, the
 * newest USUAL_WEIGHT_WINDOW of those, trimmed-mean'd and rounded. null when there's no history.
 * Input order doesn't matter.
 */
export function usualWeight(choices: readonly WeightChoice[]): number | null {
  const latest = new Map<string, WeightChoice>();
  for (const c of [...choices].sort(newerFirst)) {
    if (!latest.has(c.assignmentId)) latest.set(c.assignmentId, c);
  }
  const values = [...latest.values()]
    .filter((c): c is WeightChoice & { weight: number } => c.weight !== null && Number.isFinite(c.weight))
    .slice(0, USUAL_WEIGHT_WINDOW)
    .map((c) => c.weight);
  return values.length === 0 ? null : roundWeight(trimmedMean(values));
}

export type SuggestionSource = "child" | "children" | "subject" | "builtin";

export interface WeightSuggestion {
  weight: number;
  source: SuggestionSource;
  /** Children whose history fed the learned weight (empty unless the source is child/children). */
  childIdsWithHistory: string[];
  /** Children on the assignment with no usable history (for lessons/minutes: all of them). */
  childIdsWithout: string[];
}

function median(values: number[]): number {
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * The default weight for a new assignment, in DeeDee's precedence (D6, D19): the median of the children's
 * usual weights (pages and chapters only), else a subject default for this unit type, else the built-in.
 */
export function suggestWeight(input: {
  unitType: UnitType;
  perChild: readonly { childId: string; usual: number | null }[];
  subjectDefault: SubjectDefaultWeight | null;
}): WeightSuggestion {
  const learned = isLearnedUnit(input.unitType);
  const withHistory = learned ? input.perChild.filter((c) => c.usual !== null && isValidWeight(c.usual)) : [];
  const childIdsWithHistory = withHistory.map((c) => c.childId);
  const childIdsWithout = input.perChild.map((c) => c.childId).filter((id) => !childIdsWithHistory.includes(id));
  if (withHistory.length > 0) {
    return {
      weight: roundWeight(median(withHistory.map((c) => c.usual!))),
      source: withHistory.length === 1 ? "child" : "children",
      childIdsWithHistory,
      childIdsWithout,
    };
  }
  const resolved = weightPerUnitOf({ unitType: input.unitType, weightPerUnit: null }, input.subjectDefault);
  return { weight: resolved.weight, source: resolved.source === "subject" ? "subject" : "builtin", childIdsWithHistory, childIdsWithout };
}

// ---- Effort asked in time (S6-09, decision C3) ----

/**
 * S6-09: the weight per unit that makes `minutesPerDay` of work a day, at `unitsPerDay` units a day:
 * minutes ÷ units ÷ MINUTES_PER_WEIGHT_POINT, rounded to WEIGHT_DECIMALS and kept within [MIN, MAX]. Both must be
 * positive finite numbers (EngineInputError otherwise); a result that rounds to 0 is the minimum weight.
 */
export function weightFromMinutesPerDay(minutesPerDay: number, unitsPerDay: number): number {
  if (!Number.isFinite(minutesPerDay) || minutesPerDay <= 0) throw new EngineInputError(`minutesPerDay must be a positive number, got ${minutesPerDay}`);
  if (!Number.isFinite(unitsPerDay) || unitsPerDay <= 0) throw new EngineInputError(`unitsPerDay must be a positive number, got ${unitsPerDay}`);
  const w = roundWeight(minutesPerDay / unitsPerDay / MINUTES_PER_WEIGHT_POINT);
  return Math.min(MAX_WEIGHT_PER_UNIT, Math.max(MIN_WEIGHT_PER_UNIT, w));
}

/**
 * S6-09: the inverse, for display: the minutes a day a weight asks for at `unitsPerDay` units a day (not rounded, so a
 * stored weight survives the round trip; the caller rounds for the screen).
 */
export function minutesPerDayFromWeight(weightPerUnit: number, unitsPerDay: number): number {
  if (!Number.isFinite(weightPerUnit) || weightPerUnit < 0) throw new EngineInputError(`weightPerUnit must be a non-negative number, got ${weightPerUnit}`);
  if (!Number.isFinite(unitsPerDay) || unitsPerDay < 0) throw new EngineInputError(`unitsPerDay must be a non-negative number, got ${unitsPerDay}`);
  return weightPerUnit * unitsPerDay * MINUTES_PER_WEIGHT_POINT;
}
