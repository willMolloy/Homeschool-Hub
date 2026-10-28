# S2a-03 — Add schedule validation limits

**Depends on:** Sprint 1  
**Size:** XS

## Goal
One module defines the bounds every schedule write is checked against, so nothing the API accepts can make the engine produce non-finite or absurd numbers.

## Context
Tester finding **T-ENG-2**: huge `totalUnits` × minutes can reach Infinity inside the engine. JSON can also carry `1e309`, which `JSON.parse` turns into `Infinity`. The DB columns (`numeric(10,2)`, `numeric(8,2)`, `numeric(4,3)`) would reject overflow with a 500 (SQLSTATE 22003), not a 400.

## Steps
1. Add `apps/api/src/http/scheduleLimits.ts` with exported constants and zod pieces: `LocalDate` (real `YYYY-MM-DD`, years 2000–2100), `TotalUnits` (finite, > 0, ≤ 100 000, at most 2 decimals), `MinutesPerUnit` (finite, > 0, ≤ 600, at most 2 decimals), `CapacityFraction` (finite, 0–1, at most 3 decimals), `Weekdays` (1–7 unique integers 0–6), `Title` (trimmed 1–120, no NUL), `IdList` (unique UUIDs, ≤ 50), `MAX_ASSIGNMENT_DAYS` = 1096, `MAX_BLOCKED_DAYS` = 366.
2. Helper `checkDateOrder(start, end, maxDays)` → 400 `invalid_range` message.

## Done when
- [ ] Every limit has a unit test, including `Infinity`, `NaN`, `1e309` (parsed from JSON), `1e-3` on a 2-decimal field.

## Tests
- accept/reject table per schema
- largest accepted totalUnits × largest minutesPerUnit is finite and fits `numeric`

## Out of scope
- Engine-side clamping (engine stays as is; T-ENG-2 stays documented there).
