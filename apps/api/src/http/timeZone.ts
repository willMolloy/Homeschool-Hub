/**
 * IANA time zones (S2a-01). Postgres can't check these in a CHECK constraint, so the API validates on write
 * and `safeTimeZone()` guards every read (tester finding T-API-3).
 */
import { z } from "zod";

/** The `family.time_zone` column default. */
export const DEFAULT_TIME_ZONE = "America/Chicago";

// IANA spelling: "UTC" or Area/Location[/Sub], each part starting with a capital or digit (Etc/GMT+5 is legal).
const IANA_SHAPE = /^(?:UTC|[A-Z][A-Za-z_-]+(?:\/[A-Z0-9][A-Za-z0-9_+-]*)+)$/;

/**
 * A real IANA zone name, spelled the IANA way. ICU decides whether the zone exists, so links/aliases
 * ("Asia/Kolkata", "US/Central") are fine; offsets ("+05:00") and other spellings ("america/chicago") are not.
 * (`Intl.supportedValuesOf` is not used: it lists ICU's older canonical names, e.g. Asia/Calcutta, not Asia/Kolkata.)
 */
export function isIanaTimeZone(s: unknown): s is string {
  if (typeof s !== "string" || !IANA_SHAPE.test(s)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s });
    return true;
  } catch {
    return false;
  }
}

/** The stored zone if it's valid, else the default (and `onInvalid` is told). */
export function safeTimeZone(stored: string, onInvalid?: (bad: string) => void): string {
  if (isIanaTimeZone(stored)) return stored;
  onInvalid?.(stored);
  return DEFAULT_TIME_ZONE;
}

export const TimeZone = z.string().refine(isIanaTimeZone, "Time zone must be an IANA name like America/Chicago.");
