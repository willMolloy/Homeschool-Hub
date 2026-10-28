# S2a-02 — Add the family settings endpoint

**Depends on:** S2a-01  
**Size:** S

## Goal
`GET /api/family` and `PATCH /api/family` read and change the signed-in family's name, week start, school days and time zone.

## Context
Columns: `name`, `week_start` ('mon'|'sun'), `school_days` (smallint[] of 0–6, 0 = Sunday), `time_zone`. `GET /api/me` keeps its shape but also gains `timeZone` so the web app has it without another call.

## Steps
1. Schemas: `name` = family name (trimmed, 1–60, no NUL); `weekStart` enum; `schoolDays` = 1–7 unique integers 0–6 (stored sorted); `timeZone` = `TimeZone` from S2a-01, which validates against the **server's** ICU data (not `Intl.supportedValuesOf`). Since S2a-17 it also stores the canonical spelling (`US/Central` → `America/Chicago`, `AMERICA/CHICAGO` → `America/Chicago`), and the Settings picker gets its list from `GET /api/timezones`. Strict object; at least one field.
2. PATCH updates only the sent fields plus `updated_at` and returns the full settings JSON `{ name, weekStart, schoolDays, timeZone }`.
3. Add `timeZone` to `/api/me` (and the web `Me` type).

## Done when
- [x] A PATCH is visible in `GET /api/family` and `GET /api/me`, and the plan uses the new school days.

## Tests
- GET → settings of the session family only
- PATCH each field alone → 200 and persisted
- alias or other casing → stored canonically (S2a-17)
- bad zone / empty schoolDays / day 7 / duplicate days / weekStart 'tue' / 61-char name / unknown key / empty body → 400
- PATCH schoolDays → `/api/plan` stops planning on the removed day
- signed out → 401

## Out of scope
- Changing the login email or password.
- Per-child school days.
