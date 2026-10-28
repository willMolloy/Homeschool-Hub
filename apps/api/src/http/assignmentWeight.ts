/**
 * Weight rules for assignment writes (S2b-06). Pure functions: the route parses, these decide.
 *
 *   - weightPerUnit is the source of truth (0.01–100, 2 decimals, null = subject default, then built-in) and is
 *     allowed on every unit type, minutes included (a weight per minute, D21).
 *   - minutesPerUnit is a legacy alias the web still sends until S2b-10: translated at 2 minutes = 1 point (D1)
 *     and clamped into the weight bounds (D3). RF-10 still rejects it on minutes assignments.
 *   - Changing unitType while a weight is stored needs an explicit new weight (or null) (D7): a page weight
 *     means nothing as a lesson or minute weight, so it is never silently carried over.
 */
import { MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, WEIGHT_DECIMALS, type UnitType } from "@hh/engine";
import { HttpError } from "./errors";

/** The weight fields of a create or patch body. undefined = not sent. */
export interface WeightFields {
  weightPerUnit?: number | null;
  /** TODO(S2b-13): remove the legacy alias. */
  minutesPerUnit?: number | null;
}

/** The stored values a write puts in the two columns. undefined = leave the column as it is. */
export interface WeightWrite {
  weightPerUnit: number | null | undefined;
  /** The legacy column (dropped in S2b-15): the alias value when sent, else weight × 2, never on minutes. */
  minutesPerUnit: number | null | undefined;
}

const invalid = (message: string) => new HttpError(400, "invalid_request", message);
const round = (v: number) => Math.round(v * 10 ** WEIGHT_DECIMALS) / 10 ** WEIGHT_DECIMALS;

/** A legacy minutes-per-unit as a weight: mpu / 2, rounded to 2 decimals, kept within the bounds. */
export function weightFromLegacyMinutes(mpu: number | null): number | null {
  if (mpu == null) return null;
  return Math.min(MAX_WEIGHT_PER_UNIT, Math.max(MIN_WEIGHT_PER_UNIT, round(mpu / MINUTES_PER_WEIGHT_POINT)));
}

/** The legacy minutes value implied by a weight, for the transition column. */
function legacyMinutesFromWeight(weight: number | null): number | null {
  return weight == null ? null : round(weight * MINUTES_PER_WEIGHT_POINT);
}

/** 400 when both fields are sent, or (RF-10) a legacy minutesPerUnit is sent for a minutes assignment. */
export function checkWeightFields(unitType: UnitType, b: WeightFields): void {
  if (b.weightPerUnit !== undefined && b.minutesPerUnit !== undefined) {
    throw invalid("minutesPerUnit: send weightPerUnit only.");
  }
  if (unitType === "minutes" && b.minutesPerUnit != null) {
    throw invalid("minutesPerUnit: doesn't apply to minutes; leave it empty.");
  }
}

/** 400 when the unit type changes, a weight is stored and the body names no new weight (D7). */
export function checkUnitChange(cur: { unitType: UnitType; weightPerUnit: number | null }, next: UnitType | undefined, b: WeightFields): void {
  if (next === undefined || next === cur.unitType || cur.weightPerUnit == null) return;
  if (b.weightPerUnit !== undefined || b.minutesPerUnit !== undefined) return;
  throw invalid("weightPerUnit: send a weight (or null) when changing unitType.");
}

/**
 * What to store for the sent weight fields on a row whose (merged) unit type is `unitType`.
 * `switchingToMinutes` clears the legacy column even when no weight field is sent (the 003 CHECK).
 */
export function weightWrite(unitType: UnitType, b: WeightFields, switchingToMinutes = false): WeightWrite {
  if (b.minutesPerUnit !== undefined) {
    return { weightPerUnit: weightFromLegacyMinutes(b.minutesPerUnit), minutesPerUnit: b.minutesPerUnit };
  }
  if (b.weightPerUnit !== undefined) {
    return { weightPerUnit: b.weightPerUnit, minutesPerUnit: unitType === "minutes" ? null : legacyMinutesFromWeight(b.weightPerUnit) };
  }
  return { weightPerUnit: undefined, minutesPerUnit: switchingToMinutes ? null : undefined };
}
