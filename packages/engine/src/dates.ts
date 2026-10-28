/**
 * Local calendar dates as plain "YYYY-MM-DD" strings.
 *
 * The engine never uses JavaScript Date objects. All arithmetic goes through an
 * integer "day number" (days since 1970-01-01 in the proleptic Gregorian
 * calendar), computed with Howard Hinnant's civil-date algorithms. That makes
 * every result independent of the machine's time zone and of DST changes: a
 * school day is a calendar square, not a timestamp.
 */
import type { LocalDate, Weekday, WeekStart } from "./types";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class EngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineInputError";
  }
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] ?? 0;
}

/** Days since 1970-01-01 for a civil date. */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of daysFromCivil. */
export function civilFromDays(n: number): [number, number, number] {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
}

export function isValidLocalDate(s: unknown): s is LocalDate {
  if (typeof s !== "string") return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

/** "YYYY-MM-DD" -> day number. Throws EngineInputError on anything else (including 2027-02-29). */
export function toDayNumber(s: LocalDate): number {
  if (!isValidLocalDate(s)) throw new EngineInputError(`Invalid local date: ${JSON.stringify(s)} (expected a real YYYY-MM-DD date)`);
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return daysFromCivil(y, m, d);
}

export function fromDayNumber(n: number): LocalDate {
  const [y, m, d] = civilFromDays(n);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(s: LocalDate, n: number): LocalDate {
  return fromDayNumber(toDayNumber(s) + n);
}

/** b - a in days. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** 0 = Sunday ... 6 = Saturday (same convention as Date#getDay and Postgres EXTRACT(DOW)). */
export function weekdayOfDayNumber(n: number): Weekday {
  return ((((n + 4) % 7) + 7) % 7) as Weekday; // 1970-01-01 was a Thursday
}

export function weekdayOf(s: LocalDate): Weekday {
  return weekdayOfDayNumber(toDayNumber(s));
}

/** Day number of the first day of the week containing n. */
export function weekStartOfDayNumber(n: number, weekStart: WeekStart): number {
  const first = weekStart === "sun" ? 0 : 1;
  const offset = (weekdayOfDayNumber(n) - first + 7) % 7;
  return n - offset;
}

/** First day of the week containing `s`, per Family.weekStart. */
export function weekStartOf(s: LocalDate, weekStart: WeekStart): LocalDate {
  return fromDayNumber(weekStartOfDayNumber(toDayNumber(s), weekStart));
}

/** Inclusive list of dates from a to b (empty if b < a). */
export function dateRange(a: LocalDate, b: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let n = toDayNumber(a), e = toDayNumber(b); n <= e; n += 1) out.push(fromDayNumber(n));
  return out;
}
