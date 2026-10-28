# S2b-14 — Remove minute outputs from the engine

**Depends on:** S2b-13  
**Size:** S

## Goal
The engine no longer invents minutes from units. Plans carry only units and thickness, so nothing can mistake a bar for logged time.

## Context
`DayLoad.minutes` on past days is `logged units × minutesPerUnit`: a guess, not a measurement. DeeDee's rule: **logged hours come from actual logs** (`log_entry.minutes_spent`), never from bars.

## Steps
1. Delete `DEFAULT_MINUTES_PER_UNIT`, `minutesPerUnitOf` and `units.ts` (or reduce it to re-exports, if `units.ts` has other users).
2. Delete these, with their tests:
   - `Assignment.minutesPerUnit`
   - `ChildPlan.minutesPerUnit` and `minutesPerUnitEstimated`
   - `DayLoad.minutes`
   - `LaneDay.minutes`
   - `WeekSummary.totalMinutes`
3. Add a doc comment on `ChildPlan`: "Thickness is relative effort. For time spent, sum `log_entry.minutes_spent`; plans never estimate it."
4. Set `ENGINE_VERSION` to `0.3.0`.
5. Fix the consumers: the debug table already uses thickness (S2b-12). Remove any leftover `minutes` reads in the web and API.

## Done when
- [ ] `rg -n "minutes" packages/engine/src` finds only the minutes unit type and the normalization constant.
- [ ] The gate is green across the API and web.

## Tests
- A contract test: no `minutes` key anywhere in a serialized `ChildPlan` (JSON walk).
- Invariant tests keep `thickness === units × weight`.

## Out of scope
- An hours total or export from logs (a later logging sprint).
