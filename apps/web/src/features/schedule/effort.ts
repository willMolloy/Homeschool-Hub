/**
 * S6-09: the assignment form asks effort in time ("about how long will that take?") instead of a weight. Pure helpers:
 * the school days an assignment has, the units a day that gives, the preset a number of minutes is closest to, and the
 * "About 5 pages a day" line. The conversion to a weight is the engine's `weightFromMinutesPerDay`.
 */
import { isValidLocalDate, toDayNumber, weekdayOfDayNumber, type LocalDate } from "@hh/engine";
import type { UnitType } from "../../api/types";
import { UNIT_LABELS } from "../../components/unitLabels";

/** The quick answers, in minutes a day; "Custom" takes any other number. */
export const PRESET_MINUTES = [15, 30, 45, 60] as const;

/** How far a number of minutes may be from a preset to show as that preset (half the gap between presets). */
const PRESET_REACH = 7.5;

/** More days than the form accepts: no pace is worked out (the form reports the dates). */
const MAX_DAYS = 1096;

/** What the parent picked: a preset, or their own minutes (kept as typed until saved). */
export type EffortPick = { kind: "preset"; minutes: number } | { kind: "custom"; text: string };

/** The days from `start` to `end`, both included, whose weekday is in `weekdays`. 0 when the dates aren't a usable range. */
export function schoolDaysBetween(start: string, end: string, weekdays: readonly number[]): number {
  if (!isValidLocalDate(start) || !isValidLocalDate(end)) return 0;
  const a = toDayNumber(start as LocalDate);
  const b = toDayNumber(end as LocalDate);
  if (b < a || b - a + 1 > MAX_DAYS) return 0;
  let n = 0;
  for (let d = a; d <= b; d++) if (weekdays.includes(weekdayOfDayNumber(d))) n++;
  return n;
}

/** Units a day from the total, dates and days; null until all three give a pace. */
export function unitsPerDay(total: number, start: string, end: string, weekdays: readonly number[]): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const days = schoolDaysBetween(start, end, weekdays);
  return days > 0 ? total / days : null;
}

/** The option a number of minutes shows as: the preset it is within half a step of, else "custom". */
export function optionFor(minutes: number): number | "custom" {
  const nearest = PRESET_MINUTES.reduce((best, p) => (Math.abs(p - minutes) < Math.abs(best - minutes) ? p : best), PRESET_MINUTES[0] as number);
  return Math.abs(nearest - minutes) <= PRESET_REACH ? nearest : "custom";
}

/** Whole minutes for the screen, never less than 1. */
export const wholeMinutes = (m: number) => Math.max(1, Math.round(m));

/** "About 5 pages a day", "About 4.3 pages a day", "About 1 page a day". */
export function paceText(perDay: number, unitType: UnitType): string {
  const n = perDay >= 10 ? Math.round(perDay) : perDay >= 1 ? Math.round(perDay * 10) / 10 : Math.round(perDay * 100) / 100;
  const label = n === 1 ? UNIT_LABELS[unitType].one : UNIT_LABELS[unitType].many;
  return `About ${n.toLocaleString("en-US")} ${label} a day`;
}
