/**
 * S20-02: "They got to" opens on the last unit the week's words already name.
 * Chapters 16–18 open on 18, not on the cumulative position rounded up to 19.
 */
import type { UnitType } from "@hh/engine";
import { rangeWords } from "../week/weekBars";

/** The last unit number in a range such as "chapters 16–18" or "pages 120–150". */
export function lastNamedUnit(words: string): number | null {
  const text = words.replace(/day \d+ of \d+/g, "");
  let last = -Infinity;
  for (const m of text.matchAll(/(\d+)(?:[–-](\d+))?/g)) last = Math.max(last, Number(m[2] ?? m[1]));
  return last === -Infinity ? null : last;
}

/** Where Update status opens when nothing has been saved: the last unit the week names. */
export function scheduledPosition(item: { unitType: UnitType; plannedFrom: number; plannedTo: number; totalUnits: number }): number {
  if (item.unitType === "minutes") return item.plannedTo;
  const last = lastNamedUnit(rangeWords(item.unitType, item.plannedFrom, item.plannedTo, item.totalUnits, true));
  return last ?? Math.round(item.plannedTo);
}

/** The scheduled end, or within half a unit of the plan's position, counts as as planned. */
export function isScheduledEnd(item: { unitType: UnitType; plannedFrom: number; plannedTo: number; totalUnits: number }, position: number): boolean {
  if (Math.abs(position - item.plannedTo) <= 0.5) return true;
  return Math.round(position) === Math.round(scheduledPosition(item));
}
