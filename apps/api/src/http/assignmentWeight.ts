/**
 * Weight rules for assignment writes (S2b-06). Pure functions: the route parses, these decide.
 *
 *   - weightPerUnit is the only weight field (0.01–100, 2 decimals, null = subject default, then built-in) and is
 *     allowed on every unit type, minutes included (a weight per minute, D21). The old minutes
 *     alias is gone (S2b-13): the strict schemas reject it like any other unknown key.
 *   - Changing unitType while a weight is stored needs an explicit new weight (or null) (D7): a page weight
 *     means nothing as a lesson or minute weight, so it is never silently carried over.
 */
import type { UnitType } from "@hh/engine";
import { HttpError } from "./errors";

/** 400 when the unit type changes, a weight is stored and the body names no new weight (D7). */
export function checkUnitChange(
  cur: { unitType: UnitType; weightPerUnit: number | null }, next: UnitType | undefined, b: { weightPerUnit?: number | null },
): void {
  if (next === undefined || next === cur.unitType || cur.weightPerUnit == null) return;
  if (b.weightPerUnit !== undefined) return;
  throw new HttpError(400, "invalid_request", "weightPerUnit: send a weight (or null) when changing unitType.");
}
