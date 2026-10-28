/** Words for the "How did last week go?" card (S2b-25). Pure. */
import type { UnitType } from "@hh/engine";
import { UNIT_LABELS } from "../../components/unitLabels";

/** "6 assignments were planned." / "1 assignment was planned." */
export const plannedCountText = (n: number) => (n === 1 ? "1 assignment was planned." : `${n} assignments were planned.`);

/**
 * A planned week as the parent would say it: positions 0–80 of pages → "pp. 1–80", one page → "p. 81".
 * Minutes are an amount, not a place: "45 minutes". Fractional positions round outward to whole units.
 */
export function plannedRangeText(unitType: UnitType, from: number, to: number): string {
  if (unitType === "minutes") {
    const n = Math.round(to - from);
    return `${n} ${n === 1 ? UNIT_LABELS.minutes.one : UNIT_LABELS.minutes.many}`;
  }
  const first = Math.floor(from + 1e-9) + 1;
  const last = Math.max(first, Math.ceil(to - 1e-9));
  if (unitType === "pages") return first === last ? `p. ${first}` : `pp. ${first}–${last}`;
  const { one, many } = UNIT_LABELS[unitType];
  return first === last ? `${one} ${first}` : `${many} ${first}–${last}`;
}
