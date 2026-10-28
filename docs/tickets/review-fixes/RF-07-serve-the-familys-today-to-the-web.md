# RF-07 — Serve the family's today to the web

**Depends on:** RF-06  
**Size:** S  
**Review refs:** tester M-8

## Goal
`GET /api/me` returns `today` (YYYY-MM-DD in the family's time zone, from the injected clock), and the web picks its default week from it instead of the device date.

## Context
The plan screen's default week uses the device's local date while the server plans in the family's zone. A parent travelling, or a device set to another zone, sees a different week from the plan's `asOf`.

## Steps
1. `/api/me` adds `today` via `familyToday` (a bad stored zone falls back and warns, like the plan route).
2. Web `Me` type gets `today`. `PlanDebugView` uses `me.today` for the default week. `deviceToday` stays only as a fallback while `/api/me` hasn't loaded (it can't be missing once signed in).
3. Fake API `DEMO_ME` gets a fixed `today`.

## Done when
- [x] With the device clock and the family's zone on different dates, the plan screen opens on the family's week.

## Tests
- API: fixed clock 2026-11-02T10:30Z → Chicago `today` 2026-11-02, Kiritimati 2026-11-03; a bad stored zone → the default zone's date, 200.
- Web: with `me.today` = a date in another week than the (mocked) device date, the default `from`/`to` requested from `/api/plan` follow `me.today`.

## Out of scope
- A live "midnight rollover" while the page is open.
