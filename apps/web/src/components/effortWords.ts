/**
 * S7-17: a subject's usual effort in the parent's words, in one place so every screen says it the same way. The
 * subject screens (list, form) state it per unit, which doesn't depend on any pace: "about 2 min a page", "about 30 min
 * a lesson". Assignment screens keep "about N min a day" at their own pace and, in their hint, name the per-unit
 * figure too ("Math usually takes about 30 min a lesson (about 32 min a day here)."). Storage is unchanged: the
 * minutes are the weight times `MINUTES_PER_WEIGHT_POINT`.
 * S7b-07 (F4): for a minutes-based subject a "unit" is a minute of lesson, so "1 min a minute" says nothing. Those say
 * what a typical day of it comes to instead ("about 30 min a day", for the 30 units a day the preview bar shows).
 */
import { DEFAULT_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, type UnitType } from "@hh/engine";
import { UNIT_LABELS } from "./unitLabels";

/** S7b-07: the units a typical day of a minutes-based subject holds (the same 30 as the picker's preview bar, `TYPICAL_DAY`). */
export const MINUTES_UNIT_TYPICAL_DAY = 30;

/** Minutes one unit takes at this weight (null = the built-in for the unit). */
export const minutesPerUnit = (unitType: UnitType, weight: number | null): number => (weight ?? DEFAULT_WEIGHT_PER_UNIT[unitType]) * MINUTES_PER_WEIGHT_POINT;

/** 30 → "30", 1.5 → "1.5", 1.04 → "1", 14.6 → "15": whole minutes from 10 up, one decimal below. */
const figure = (m: number) => (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10).toLocaleString("en-US");

/** The figure a minutes-based subject states: minutes in a typical day (S7b-07). */
export const typicalDayFigure = (weight: number | null): number => minutesPerUnit("minutes", weight) * MINUTES_UNIT_TYPICAL_DAY;

/** "30 min a lesson", "2 min a page"; a minutes-based subject says "30 min a day" (S7b-07). */
export const perUnitMinutesText = (unitType: UnitType, weight: number | null): string =>
  unitType === "minutes" ? `${figure(typicalDayFigure(weight))} min a day` : `${figure(minutesPerUnit(unitType, weight))} min a ${UNIT_LABELS[unitType].one}`;

/** "about 30 min a lesson": the subject screens' wording. */
export const usualEffortText = (unitType: UnitType, weight: number | null): string => `about ${perUnitMinutesText(unitType, weight)}`;

/** "Light · 15 min a lesson": a preset chip. */
export const presetChipDetail = (unitType: UnitType, weight: number): string => `· ${perUnitMinutesText(unitType, weight)}`;

/** The Custom field's starting text: the minutes a unit takes (a typical day, for minutes), to two decimals. */
export const customMinutesText = (unitType: UnitType, weight: number): string =>
  String(Math.round((unitType === "minutes" ? typicalDayFigure(weight) : minutesPerUnit(unitType, weight)) * 100) / 100);

/** "Math usually takes about 30 min a lesson (about 32 min a day here)." `minutesADay` is at the assignment's own pace. */
export const subjectUsualHint = (subjectName: string, unitType: UnitType, weight: number, minutesADay: number): string =>
  unitType === "minutes"
    ? `${subjectName} usually takes about ${minutesADay} min a day.` // S7b-07: not "1 min a minute"
    : `${subjectName} usually takes ${usualEffortText(unitType, weight)} (about ${minutesADay} min a day here).`;
