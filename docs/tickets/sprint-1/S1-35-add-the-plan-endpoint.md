# S1-35 — Add the plan endpoint

**Depends on:** S1-34, S1-13  
**Size:** S

## Goal
`GET /api/plan?from=YYYY-MM-DD&to=YYYY-MM-DD&asOf=YYYY-MM-DD` returns per-child, per-assignment daily loads from the engine plus the engine version.

## Context
The rate is never stored. Every request recomputes it from rows. The response is what the timeline UI will draw later. Keep it close to the engine's own types so the UI can use the engine's `aggregate()` client-side for zoom levels.

## Steps
1. Validate the query: dates must parse with the engine's `toDayNumber` (catch `EngineInputError` → 400); `from <= to`; range ≤ 400 days; `asOf` defaults to the family's local today. Compute it from `family.time_zone` with `Intl.DateTimeFormat('en-CA', { timeZone })`. Don't use the server's clock zone.
2. Call `loadPlanInputs`, then `planAll(assignments, { ...ctx, asOf })`.
3. Trim each plan's `days` to `[from, to]`. Keep `rate`, `baseRate`, `end`, `plannedEnd`, `mode`, `minutesPerUnitEstimated`, `remainingUnits`, `unplacedUnits`, `warnings` untouched.
4. Respond `{ engineVersion: ENGINE_VERSION, asOf, from, to, plans: ChildPlan[] }`.
5. Add the `PlanResponse` type to `apps/web/src/api/types.ts`. Import `ChildPlan` from `@hh/engine` so it can't drift.

## Done when
- [ ] curl with the demo cookie returns plans for both kids for Oct 2026.
- [ ] Response contains `engineVersion: '0.1.0'`.

## Tests
- integration: seeded family, from=2026-10-26 to=2026-10-30 asOf=2026-10-26 → TI/frank days sum to 90
- from > to → 400
- bad date '2026-02-30' → 400
- range > 400 days → 400
- no NaN anywhere in the JSON (scan the body for 'NaN'/'null' in number fields)
- signed out → 401

## Out of scope
- Writing overrides or logs (Sprint 2).
- Weekly aggregation on the server (the client does it).
