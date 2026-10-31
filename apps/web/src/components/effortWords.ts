/**
 * S7-17: a subject's usual effort in the parent's words, in one place so every screen says it the same way. The
 * subject screens (list, form) state it per unit, which doesn't depend on any pace: "about 2 min a page", "about 30 min
 * a lesson". Assignment screens keep "about N min a day" at their own pace and, in their hint, name the per-unit
 * figure too ("Math usually takes about 30 min a lesson (about 32 min a day here)."). Storage is unchanged: the
 * minutes are the weight times `MINUTES_PER_WEIGHT_POINT`.
 */
import { DEFAULT_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, type UnitType } from "@hh/engine";
import { UNIT_LABELS } from "./unitLabels";

/** Minutes one unit takes at this weight (null = the built-in for the unit). */
export const minutesPerUnit = (unitType: UnitType, weight: number | null): number => (weight ?? DEFAULT_WEIGHT_PER_UNIT[unitType]) * MINUTES_PER_WEIGHT_POINT;

/** 30 → "30", 1.5 → "1.5", 1.04 → "1", 14.6 → "15": whole minutes from 10 up, one decimal below. */
const figure = (m: number) => (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10).toLocaleString("en-US");

/** "30 min a lesson", "2 min a page". */
export const perUnitMinutesText = (unitType: UnitType, weight: number | null): string =>
  `${figure(minutesPerUnit(unitType, weight))} min a ${UNIT_LABELS[unitType].one}`;

/** "about 30 min a lesson": the subject screens' wording. */
export const usualEffortText = (unitType: UnitType, weight: number | null): string => `about ${perUnitMinutesText(unitType, weight)}`;

/** "Light · 15 min a lesson": a preset chip. */
export const presetChipDetail = (unitType: UnitType, weight: number): string => `· ${perUnitMinutesText(unitType, weight)}`;

/** The Custom field's starting text: the minutes a unit takes, to two decimals. */
export const customMinutesText = (unitType: UnitType, weight: number): string => String(Math.round(minutesPerUnit(unitType, weight) * 100) / 100);

/** "Math usually takes about 30 min a lesson (about 32 min a day here)." `minutesADay` is at the assignment's own pace. */
export const subjectUsualHint = (subjectName: string, unitType: UnitType, weight: number, minutesADay: number): string =>
  `${subjectName} usually takes ${usualEffortText(unitType, weight)} (about ${minutesADay} min a day here).`;
