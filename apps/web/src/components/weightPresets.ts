/** Thickness-picker presets and the bits of arithmetic behind its preview (S2b-34, D22). Pure. */
import { DEFAULT_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, roundWeight, type UnitType } from "@hh/engine";

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

/** "1 lesson a day ≈ 30 min of work" (null = the built-in). */
export function previewCaption(unitType: UnitType, value: number | null): string {
  const day = TYPICAL_DAY[unitType];
  const weight = value ?? DEFAULT_WEIGHT_PER_UNIT[unitType];
  const minutes = Math.round(day.units * weight * MINUTES_PER_WEIGHT_POINT);
  return `${day.text} a day ≈ ${minutes.toLocaleString("en-US")} min of work`;
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
