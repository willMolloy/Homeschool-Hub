/**
 * S20-01: a minutes assignment is minutes a day plus the dates. The stored total is that daily amount times the
 * school days in the dates (the parent never sees it), and the weight is the built-in 0.5 so one unit is one minute.
 */
import { DEFAULT_WEIGHT_PER_UNIT, minutesPerDayFromWeight, weightPerUnitOf, type SubjectDefaultWeight } from "@hh/engine";
import { PRESET_MINUTES, schoolDaysBetween } from "./effort";

/** What a new minutes assignment starts on when she has not chosen yet. */
export const MINUTES_A_DAY_DEFAULT = 30;
/** A day has this many minutes: the most a custom answer may be. */
export const MAX_MINUTES_A_DAY = 1440;
/** 0.5, so minutes a day equals the units placed on a full day. */
export const MINUTES_DAILY_WEIGHT = DEFAULT_WEIGHT_PER_UNIT.minutes;

/** The total that places `minutesPerDay` on each of `days` school days. */
export function minutesPile(minutesPerDay: number, days: number): number {
  return Math.round((minutesPerDay * days + Number.EPSILON) * 100) / 100;
}

/** The minutes a day to show: the stored number, else the total spread over `days`. */
export function dailyMinutesOf(a: { totalUnits: number; weightPerUnit: number | null; minutesPerDay?: number | null }, days: number, subjectDefault: SubjectDefaultWeight | null): number {
  if (a.minutesPerDay != null && Number.isFinite(a.minutesPerDay)) return a.minutesPerDay;
  return impliedMinutesPerDay(a.totalUnits, a.weightPerUnit, days, subjectDefault);
}

/** S18c-06: a whole number of minutes for the list and the edit box. 66.67 is shown as 67. The stored amount stays exact. */
export function formatDailyMinutes(n: number): string {
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

/**
 * A preset only when the stored amount is that preset. 67 is not 60, and a displayed 67 must not
 * select the 60 chip (Sprint 20 M1). Rounding for the screen does not change this.
 */
export function exactPreset(minutes: number): number | "custom" {
  const hit = (PRESET_MINUTES as readonly number[]).find((p) => Math.abs(p - minutes) < 0.005);
  return hit ?? "custom";
}

/** The minutes a day a stored minutes assignment already implies, over `days` school days. */
export function impliedMinutesPerDay(total: number, weight: number | null, days: number, subjectDefault: SubjectDefaultWeight | null): number {
  const w = weightPerUnitOf({ unitType: "minutes", weightPerUnit: weight }, subjectDefault).weight;
  if (!(days > 0)) return MINUTES_A_DAY_DEFAULT;
  return minutesPerDayFromWeight(w, total / days);
}

export function schoolDayCount(start: string, end: string, weekdays: readonly number[]): number {
  return schoolDaysBetween(start, end, weekdays);
}
