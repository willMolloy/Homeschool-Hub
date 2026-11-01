/** Display text for assignment weights (S2b-10). Pure, so the card and form agree and tests stay simple. */
import { DEFAULT_WEIGHT_PER_UNIT, minutesPerDayFromWeight, weightPerUnitOf } from "@hh/engine";
import type { Assignment, SubjectDefaultWeight, UnitType } from "../../api/types";

/** 1.4 → "1.4", 0.5 → "0.5", 20 → "20" (at most two decimals, no grouping surprises below 1,000). */
export const formatWeight = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * S6b-13: the card's effort in the parent's words, "about 30 min a day" at the assignment's pace (null when it has no
 * usable pace: no school days in its dates). Never a weight.
 */
export function effortCardText(a: Pick<Assignment, "unitType" | "weightPerUnit">, subjectDefault: SubjectDefaultWeight | null, unitsPerDay: number | null): string | null {
  if (unitsPerDay === null) return null;
  const minutes = minutesPerDayFromWeight(weightPerUnitOf(a, subjectDefault).weight, unitsPerDay);
  return `about ${Math.max(1, Math.round(minutes))} min a day`;
}

/** The form hint under the weight field. */
export function weightHint(unitType: UnitType): string {
  return `Relative effort; 1 point ≈ 2 minutes. Blank = the subject's default or the built-in (${formatWeight(DEFAULT_WEIGHT_PER_UNIT[unitType])}).`;
}
