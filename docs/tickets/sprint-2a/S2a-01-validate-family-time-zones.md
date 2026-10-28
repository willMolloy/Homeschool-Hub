# S2a-01 — Validate family time zones

**Depends on:** Sprint 1  
**Size:** XS

## Goal
A family's `time_zone` can only ever be a real IANA zone, and a bad stored value can no longer turn `GET /api/plan` into a 500.

## Context
Tester finding **T-API-3**: `family.time_zone` is free text; `localToday()` throws a RangeError on a bad zone, so every `/api/plan` without `asOf` is a 500. Postgres can't validate IANA names in a CHECK, so validation lives in the API (write side) plus a safe fallback (read side).

## Steps
1. Add `apps/api/src/http/timeZone.ts`: `isIanaTimeZone(s)` (member of `Intl.supportedValuesOf('timeZone')`, or `UTC`) and a zod `TimeZone` schema.
2. Make `localToday()` fall back to `DEFAULT_TIME_ZONE` (`America/Chicago`, the column default) and log a warning when the stored zone is invalid.
3. Flip the tester's `it.fails` in `tester.robustness.test.ts` to a normal passing test.

## Done when
- [ ] `UPDATE family SET time_zone='Mars/Olympus_Mons'` then `GET /api/plan?from=…&to=…` → 200 with asOf = today in America/Chicago.

## Tests
- `isIanaTimeZone`: America/Chicago, Europe/London, UTC → true; `Mars/Olympus_Mons`, `''`, `+05:00`, `america/chicago`? (document whichever Intl says), NUL → false
- bad stored zone → /api/plan 200, asOf = Chicago today

## Out of scope
- Writing the zone (S2a-02).
- A DB CHECK (not expressible).
