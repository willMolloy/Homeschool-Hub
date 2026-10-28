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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const md = (d: string) => ({ m: MONTHS[Number(d.slice(5, 7)) - 1]!, d: Number(d.slice(8, 10)) });

/** A week as "Oct 12–18", or "Sep 28 – Oct 4" across a month (S2b-27). Locale-free so tests are stable. */
export function weekRangeText(weekStart: string, weekEnd: string): string {
  const a = md(weekStart);
  const b = md(weekEnd);
  return a.m === b.m ? `${a.m} ${a.d}–${b.d}` : `${a.m} ${a.d} – ${b.m} ${b.d}`;
}

/** The picker's label for a week's review state (S2b-27). */
export const reviewStatusText = (status: "reviewed" | "skipped" | null) => status ?? "not reviewed";
