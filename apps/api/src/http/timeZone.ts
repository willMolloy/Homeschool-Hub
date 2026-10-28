/**
 * IANA time zones (S2a-01, S2a-17). Postgres can't check these in a CHECK constraint, so the API validates and
 * canonicalizes on write, and `safeTimeZone()` guards every read (tester finding T-API-3).
 *
 * The server is the single source of truth: `timeZoneList()` is what `GET /api/timezones` serves to the Settings
 * picker, and every write is stored in the same canonical spelling (tester findings T2-2, T2-3).
 */
import { z } from "zod";

/** The `family.time_zone` column default. */
export const DEFAULT_TIME_ZONE = "America/Chicago";

// IANA shape, any letter case: "UTC" or Area/Location[/Sub] (Etc/GMT+5 is legal). Abbreviations such as EST,
// GMT, Zulu or CST6CDT and offsets such as +05:00 never match, even though ICU knows some of them.
const IANA_SHAPE = /^(?:UTC|[A-Z][A-Z_-]+(?:\/[A-Z0-9][A-Z0-9_+-]*)+)$/i;

/**
 * ICU still resolves some zones to names IANA has since renamed (e.g. Asia/Kolkata → Asia/Calcutta).
 * These map ICU's name to the current IANA one. A pair is only used when this ICU knows the new name.
 */
const CURRENT_NAME: Record<string, string> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Coral_Harbour": "America/Atikokan",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

/** ICU's resolved name for `s`, or null when ICU doesn't know the zone. */
function icuResolve(s: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: s }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function currentName(icuName: string): string {
  const next = CURRENT_NAME[icuName];
  return next !== undefined && icuResolve(next) === icuName ? next : icuName;
}

/**
 * The one spelling we store: e.g. "AMERICA/CHICAGO", "us/central" → "America/Chicago", "Asia/Calcutta" →
 * "Asia/Kolkata", "Etc/UTC" → "UTC". Null when `s` isn't an IANA-shaped name of a zone this server knows.
 */
export function canonicalTimeZone(s: unknown): string | null {
  if (typeof s !== "string" || !IANA_SHAPE.test(s)) return null;
  const resolved = icuResolve(s);
  return resolved === null ? null : currentName(resolved);
}

/** A real IANA zone name (any letter case, aliases allowed). */
export function isIanaTimeZone(s: unknown): s is string {
  return canonicalTimeZone(s) !== null;
}

let cachedList: string[] | undefined;
/** Every zone this server's ICU knows, in canonical spelling, plus UTC; sorted and unique (GET /api/timezones). */
export function timeZoneList(): string[] {
  if (!cachedList) {
    const zones = new Set<string>(["UTC"]);
    for (const z of Intl.supportedValuesOf("timeZone")) {
      const c = canonicalTimeZone(z);
      if (c !== null) zones.add(c);
    }
    cachedList = [...zones].sort();
  }
  return [...cachedList];
}

/** The stored zone if it's valid, else the default (and `onInvalid` is told). */
export function safeTimeZone(stored: string, onInvalid?: (bad: string) => void): string {
  if (isIanaTimeZone(stored)) return stored;
  onInvalid?.(stored);
  return DEFAULT_TIME_ZONE;
}

/** Validates and transforms to the canonical spelling. */
export const TimeZone = z
  .string()
  .refine(isIanaTimeZone, "Time zone must be an IANA name like America/Chicago.")
  .transform((s) => canonicalTimeZone(s) as string);
