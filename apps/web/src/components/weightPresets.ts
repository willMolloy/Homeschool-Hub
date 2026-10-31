/** Thickness-picker presets and the bits of arithmetic behind its preview (S2b-34, D22). Pure. */
import { DEFAULT_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, roundWeight, type UnitType } from "@hh/engine";
import { usualEffortText } from "./effortWords";
import { UNIT_LABELS } from "./unitLabels";

export type PresetKey = "none" | "light" | "normal" | "heavy" | "veryHeavy" | "custom";

/** Multipliers of the unit's built-in weight. */
export const PRESETS: readonly { key: Exclude<PresetKey, "none" | "custom">; label: string; multiplier: number }[] = [
  { key: "light", label: "Light", multiplier: 0.5 },
  { key: "normal", label: "Normal", multiplier: 1 },
  { key: "heavy", label: "Heavy", multiplier: 1.5 },
  { key: "veryHeavy", label: "Very heavy", multiplier: 2 },
];

export const presetWeight = (unitType: UnitType, multiplier: number) => roundWeight(DEFAULT_WEIGHT_PER_UNIT[unitType] * multiplier);

/** Which preset a stored value shows as: None for null, a named preset on an exact match, else Custom. */
export function presetFor(unitType: UnitType, value: number | null): PresetKey {
  if (value == null) return "none";
  return PRESETS.find((p) => presetWeight(unitType, p.multiplier) === value)?.key ?? "custom";
}

/** A typical day's work for the preview. */
export const TYPICAL_DAY: Readonly<Record<UnitType, { units: number; text: string }>> = {
  pages: { units: 20, text: "20 pages" },
  chapters: { units: 1, text: "1 chapter" },
  lessons: { units: 1, text: "1 lesson" },
  minutes: { units: 30, text: "30 minutes" },
};
/** The faint reference bar: 20 pages at normal weight. */
export const REFERENCE_THICKNESS = TYPICAL_DAY.pages.units * DEFAULT_WEIGHT_PER_UNIT.pages;

/** S7-17: "About 30 min a lesson. The bar shows 1 lesson a day." (null = the built-in). */
export function previewCaption(unitType: UnitType, value: number | null): string {
  const about = usualEffortText(unitType, value);
  return `${about[0]!.toUpperCase()}${about.slice(1)}. The bar shows ${TYPICAL_DAY[unitType].text} a day.`;
}

/** Parse the Custom field: a number more than 0, at most the engine max, two decimals. Message on failure. */
export function parseCustomWeight(raw: string): number | string {
  const t = raw.trim();
  if (!t) return "Enter a weight.";
  const v = Number(t);
  if (!Number.isFinite(v)) return "Weight must be a number.";
  if (v <= 0 || v > MAX_WEIGHT_PER_UNIT) return `Weight must be more than 0 and at most ${MAX_WEIGHT_PER_UNIT}.`;
  if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return "Weight can have at most 2 decimal places.";
  return v;
}

/** S6b-13: the minutes a typical day (TYPICAL_DAY) takes at this weight (null = the built-in); the parent sees minutes, never the weight. */
export const typicalDayMinutes = (unitType: UnitType, value: number | null): number =>
  Math.round(TYPICAL_DAY[unitType].units * (value ?? DEFAULT_WEIGHT_PER_UNIT[unitType]) * MINUTES_PER_WEIGHT_POINT);

/** The most minutes one unit may take: the engine's largest weight. */
const MAX_UNIT_MINUTES = MAX_WEIGHT_PER_UNIT * MINUTES_PER_WEIGHT_POINT;

/**
 * S6b-13, S7-17: parse the Custom field, the minutes one unit takes (a page, a lesson), into the weight per unit it
 * stands for (two decimals, as stored). Message on failure.
 */
export function parseCustomMinutes(raw: string, unitType: UnitType): number | string {
  const t = raw.trim();
  if (!t) return "Enter the minutes.";
  const m = Number(t);
  if (!Number.isFinite(m)) return "Minutes must be a number.";
  if (m <= 0 || m > MAX_UNIT_MINUTES) return `Minutes must be more than 0 and at most ${MAX_UNIT_MINUTES.toLocaleString("en-US")}.`;
  const weight = roundWeight(m / MINUTES_PER_WEIGHT_POINT);
  if (weight < MIN_WEIGHT_PER_UNIT || weight > MAX_WEIGHT_PER_UNIT) return `That is too far from usual for a ${UNIT_LABELS[unitType].one}. Try another number of minutes.`;
  return weight;
}
