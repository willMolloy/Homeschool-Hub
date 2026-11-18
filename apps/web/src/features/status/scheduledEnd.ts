/**
 * S20-02: "They got to" opens on the last unit the week's words already name.
 * Chapters 16–18 open on 18, not on the cumulative position rounded up to 19.
 * H1: those words are the same ones the sheet shows, including "chapters 14–17 (starts 17)".
 */
import type { UnitType } from "@hh/engine";
import { rangeWords } from "../week/weekBars";

/** The last unit number in a range such as "chapters 16–18" or "chapters 14–17 (starts 17)". */
export function lastNamedUnit(words: string): number | null {
  const text = words.replace(/day \d+ of \d+/g, "");
  let last = -Infinity;
  for (const m of text.matchAll(/(\d+)(?:[–-](\d+))?/g)) last = Math.max(last, Number(m[2] ?? m[1]));
  return last === -Infinity ? null : last;
}

/**
 * Where Update status opens when nothing has been saved: the last unit the week names.
 * `words` is the line the sheet shows (`itemRangeWords`). Without it, the finished units alone are used.
 */
export function scheduledPosition(item: { unitType: UnitType; plannedFrom: number; plannedTo: number; totalUnits: number }, words?: string): number {
  if (item.unitType === "minutes") return item.plannedTo;
  const text = words ?? rangeWords(item.unitType, item.plannedFrom, item.plannedTo, item.totalUnits, true);
  const last = lastNamedUnit(text);
  return last ?? Math.round(item.plannedTo);
}

/**
 * As planned when the number is the last unit the week's words name, or the plan's own position
 * (what an as-planned save stored). A nearby whole unit is not as planned just because it is close to that position.
 */
export function isScheduledEnd(item: { unitType: UnitType; plannedFrom: number; plannedTo: number; totalUnits: number }, position: number, words?: string): boolean {
  if (Math.abs(position - item.plannedTo) <= 1e-6) return true;
  return Math.round(position) === Math.round(scheduledPosition(item, words));
}
