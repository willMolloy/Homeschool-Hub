/**
 * "What day is it?" for a family. Every caller goes through the app's injected clock (`app.now`, see
 * BuildOptions.now), so tests pin the instant instead of racing the wall clock.
 */
import type { FastifyRequest } from "fastify";
import { safeTimeZone } from "./timeZone";

/** The real clock: the only `new Date()` in the API. */
export const systemClock = (): Date => new Date();

/** The calendar date of `now` in `timeZone`, as YYYY-MM-DD. The server's own zone is never used. */
export function localToday(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * Today for the signed-in family whose stored zone is `storedZone`. A bad stored zone (no DB CHECK is
 * possible) falls back to the default and logs one warning instead of a RangeError 500.
 */
export function familyToday(req: FastifyRequest, storedZone: string): string {
  const zone = safeTimeZone(storedZone, (bad) =>
    req.log.warn({ familyId: req.familyId, timeZone: bad }, "invalid family time_zone; using default"));
  return localToday(zone, req.server.now());
}
