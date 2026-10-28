/** Display text for assignment weights (S2b-10). Pure, so the card and form agree and tests stay simple. */
import { DEFAULT_WEIGHT_PER_UNIT, weightPerUnitOf } from "@hh/engine";
import type { Assignment, SubjectDefaultWeight, UnitType } from "../../api/types";

/** 1.4 → "1.4", 0.5 → "0.5", 20 → "20" (at most two decimals, no grouping surprises below 1,000). */
export const formatWeight = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Card text: "weight 1.4" for its own value, "weight ~2 (subject)" or "weight ~1 (default)" otherwise. */
export function weightCardText(a: Pick<Assignment, "unitType" | "weightPerUnit">, subjectDefault: SubjectDefaultWeight | null): string {
  const { weight, source } = weightPerUnitOf(a, subjectDefault);
  return source === "assignment" ? `weight ${formatWeight(weight)}` : `weight ~${formatWeight(weight)} (${source})`;
}

/** The form hint under the weight field. */
export function weightHint(unitType: UnitType): string {
  return `Relative effort; 1 point ≈ 2 minutes. Blank = the subject's default or the built-in (${formatWeight(DEFAULT_WEIGHT_PER_UNIT[unitType])}).`;
}
