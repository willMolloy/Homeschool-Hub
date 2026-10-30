/**
 * Re-anchoring a plan at a day (S4-00, S4-01b). Keep every day before `cut` exactly as the plan placed it, then
 * replan what is left from `from` with keepEndDate to the plan's current end, using the capacity as it is now.
 * Check-ins do the same at week level (checkins.ts); a missed day or a weekday change does it at day level.
 */
import { EPS, placeSegment, type CapacityOf, type Placement, type PreparedOverride, type Warn } from "./placement";

const sumOn = (planned: Map<number, number>, from: number, to: number): number => {
  let s = 0;
  for (const [d, v] of planned) if (d >= from && d <= to) s += v;
  return s;
};

export function replanFrom(p: Placement, cut: number, from: number, total: number, overrides: PreparedOverride[], c: CapacityOf, pushLimit: number, warn: Warn): void {
  const remaining = Math.max(0, total - sumOn(p.planned, -Infinity, cut - 1));
  // An override week the cut falls inside has already placed part of its units; only the rest is still fixed.
  const rest = overrides.map((o) => (o.w0 < from && o.w1 >= from ? { ...o, plannedUnits: sumOn(p.planned, cut, o.w1) } : o));
  for (const d of [...p.planned.keys()]) if (d >= cut) p.planned.delete(d);
  for (const d of [...p.kinds.keys()]) if (d >= cut) p.kinds.delete(d);
  if (remaining <= EPS) return;
  const seg = placeSegment({ from, end: p.endDay, pushLimit, remaining, overrides: rest, forcedMode: "keepEndDate", first: false }, c, warn);
  for (const [d, v] of seg.planned) p.planned.set(d, v);
  for (const [d, k] of seg.kinds) p.kinds.set(d, k);
  // baseRate stays the original pace (a later check-in's pushEndDate keeps it).
  Object.assign(p, { rate: seg.rate, unplaced: seg.unplaced, noCapacity: seg.noCapacity });
}
