/**
 * S6-10: "Heavier" and "Lighter" on the edit bar. One tap makes the assignment's weight per unit about 25% more or less:
 * × 1.25 or × 0.8, rounded to the weight's decimals and kept within the limits. A step that would round back to where it
 * started moves one hundredth instead, so a very light weight can still be nudged.
 */
import { MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT, roundWeight } from "@hh/engine";

export type Nudge = "heavier" | "lighter";

const FACTOR: Record<Nudge, number> = { heavier: 1.25, lighter: 0.8 };

/** The weight after a nudge; equal to `weight` only at a limit. */
export function nudgedWeight(weight: number, direction: Nudge): number {
  const inLimits = (w: number) => Math.min(MAX_WEIGHT_PER_UNIT, Math.max(MIN_WEIGHT_PER_UNIT, w));
  const next = inLimits(roundWeight(weight * FACTOR[direction]));
  if (next !== weight) return next;
  return inLimits(roundWeight(weight + (direction === "heavier" ? 0.01 : -0.01)));
}
