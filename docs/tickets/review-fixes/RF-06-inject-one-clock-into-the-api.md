# RF-06 — Inject one clock into the API

**Depends on:** RF-04  
**Size:** S  
**Review refs:** tester M-7, developer L3

## Goal
`buildApp` takes a `now: () => Date` dependency (default: the real clock), and every "what day is it" in the API goes through it.

## Context
`/api/plan` calls `new Date()` directly, so tests can't pin "today". The time-zone test allows a ±5 s window to dodge midnight.

## Steps
1. `BuildOptions.now?: () => Date`, decorated as `app.now`.
2. `http/today.ts`: `localToday(timeZone, now)` moves here from the plan route. `familyToday(app, zone, log)` applies `safeTimeZone` and `app.now()`.
3. The plan route uses it.
4. Replace the ±5 s test in `tester2.schedule.test.ts` with fixed-clock tests.

## Done when
- [ ] `rg "new Date\(\)" apps/api/src` finds only the default clock.
- [ ] No test depends on the wall clock to decide "today".

## Tests
- A fixed instant of 2026-11-02T10:30Z: Kiritimati → 2026-11-03, Pago Pago → 2026-11-01, Chicago → 2026-11-02 (asOf from `/api/plan`).
- Just before and after local midnight in Chicago (05:59Z / 06:00Z on 2026-11-02, CST) → 11-01 / 11-02.
- The default clock is the real one (asOf equals the zone's today when built without `now`).

## Out of scope
- Timestamps written by Postgres (`now()` in SQL stays the DB clock).
