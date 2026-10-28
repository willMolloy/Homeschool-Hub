/**
 * Bounds for every schedule write (S2a-03). Anything these accept keeps the engine finite and fits the
 * numeric columns (numeric(10,2), numeric(8,2), numeric(4,3)), so bad input is a 400, never a 500.
 * See tester finding T-ENG-2 (Infinity from absurd units).
 */
import { isValidLocalDate, toDayNumber } from "@hh/engine";
import { z } from "zod";
import { HttpError } from "./errors";
import { UUID_RE } from "./validate";

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;
export const MAX_TOTAL_UNITS = 100_000;
export const MAX_MINUTES_PER_UNIT = 600;
/** ~3 school years. */
export const MAX_ASSIGNMENT_DAYS = 1096;
/** One year. */
export const MAX_BLOCKED_DAYS = 366;
export const MAX_IDS = 50;
export const MAX_TITLE = 120;

/** True when `v` has at most `places` decimals (tolerant of binary float noise like 0.1 + 0.2). */
export function hasAtMostDecimals(v: number, places: number): boolean {
  const scaled = v * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** A finite number in [min, max] (exclusive of min when `minExclusive`) with limited decimals. */
function bounded(label: string, min: number, max: number, places: number, minExclusive: boolean) {
  return z
    .number(`${label} must be a number.`)
    .refine(Number.isFinite, `${label} must be a finite number.`)
    .refine((v) => (minExclusive ? v > min : v >= min) && v <= max,
      `${label} must be ${minExclusive ? "more than" : "at least"} ${min} and at most ${max.toLocaleString("en-US")}.`)
    .refine((v) => hasAtMostDecimals(v, places), `${label} can have at most ${places} decimal places.`);
}

export const TotalUnits = bounded("totalUnits", 0, MAX_TOTAL_UNITS, 2, true);
export const MinutesPerUnit = bounded("minutesPerUnit", 0, MAX_MINUTES_PER_UNIT, 2, true);
export const CapacityFraction = bounded("capacityFraction", 0, 1, 3, false);

/** A real calendar date, YYYY-MM-DD, in years 2000–2100. */
export const LocalDate = z
  .string("Dates must be YYYY-MM-DD.")
  .refine(isValidLocalDate, "Dates must be real YYYY-MM-DD dates.")
  .refine((s) => {
    const y = Number(s.slice(0, 4));
    return y >= MIN_YEAR && y <= MAX_YEAR;
  }, `Dates must be between ${MIN_YEAR} and ${MAX_YEAR}.`);

/** 1–7 distinct weekdays (0 = Sunday … 6 = Saturday), returned sorted. */
export const Weekdays = z
  .array(z.number().int("Weekdays must be whole numbers 0–6.").min(0, "Weekdays are 0 (Sunday) to 6 (Saturday).").max(6, "Weekdays are 0 (Sunday) to 6 (Saturday)."))
  .min(1, "Pick at least one day.")
  .max(7)
  .refine((d) => new Set(d).size === d.length, "Days can't repeat.")
  .transform((d) => [...d].sort((a, b) => a - b));

/** Assignment titles and event names: trimmed, 1–120, no NUL (Postgres text can't hold it). */
export const Title = z.string().trim().min(1, "Title is required.").max(MAX_TITLE, `Title must be ${MAX_TITLE} characters or fewer.`)
  .refine((s) => !s.includes("\u0000"), "Title can't contain a NUL character.");

/** Distinct row ids (lower-cased), at most `max`. */
export const IdList = (max = MAX_IDS) =>
  z.array(z.string().regex(UUID_RE, "Ids must be UUIDs.").transform((s) => s.toLowerCase()))
    .max(max, `At most ${max} ids.`)
    .refine((ids) => new Set(ids).size === ids.length, "Ids can't repeat.");

/** 400 `invalid_range` unless start ≤ end and the span (counting both ends) is at most `maxDays`. */
export function checkDateOrder(start: string, end: string, maxDays: number): void {
  const span = toDayNumber(end) - toDayNumber(start) + 1;
  if (span < 1) throw new HttpError(400, "invalid_range", "The end date must be on or after the start date.");
  if (span > maxDays) throw new HttpError(400, "invalid_range", `That range is ${span} days; the most allowed is ${maxDays}.`);
}
