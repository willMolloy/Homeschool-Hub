# S2b-02 — Plan bar thickness from weight in the engine

**Depends on:** S2b-01  
**Size:** M

## Goal
Every planned and past day carries a `thickness` = units × weight (minutes ÷ 3 for minutes assignments), and the lane and week aggregates sum thickness instead of minutes.

## Context
`planChild` (`plan.ts`) resolves `minutesPerUnitOf(a)` and sets `DayLoad.minutes = units * minutesPerUnit`. `aggregate.ts` (`mergeLane`, `weekSummaries`, `displaySeries`) sums `minutes`, and `DisplayDay.value` is documented as "Minutes drawn for this day (bar thickness)".
This ticket is **additive**: `minutes` and `minutesPerUnit*` stay on the outputs so the API and web keep compiling, and S2b-14 removes them. Thickness has no unit: it is relative effort. **Logged hours never come from bars**; they will come from `log_entry.minutes_spent` (see S2b-14 and S2b-19).

## Steps
1. `types.ts`:
   - Add `thickness: number` to `DayLoad`, documented as "relative effort; units × weight".
   - Add `weightPerUnit: number` and `weightSource: WeightSource` to `ChildPlan`.
   - Add `thickness: number` to `LaneDay`.
   - `WeekSummary`: add `totalThickness` and make `average` = totalThickness / capacityDays. Keep `totalMinutes` for now.
   - `DisplayDay.value` becomes thickness, and its doc comment says so.
2. `plan.ts`: resolve `weightPerUnitOf(a)` once beside the minutes. For every output day, set `thickness: units * weight`, for logged, planned and override days alike. Don't change how units are planned: rates, overrides and warnings are untouched.
3. `aggregate.ts`: `toLaneDays` copies `thickness`; `mergeLane` sums it; `weekSummaries` and `displaySeries` read thickness.
4. Put each `minutes` field and `minutesPerUnit*` behind a `@deprecated — removed in S2b-14` comment.
5. Set `ENGINE_VERSION` to `0.2.0`. Bar numbers change, and pre-1.0 the minor version carries breaking changes; add that note to `version.ts`. Update `apps/web/test/engine-version.test.tsx` only if it pins the literal.

## Done when
- [ ] For a pages assignment with weight 1.4 at 10 pages a day, each planned day has thickness 14.
- [ ] A 30-minute-a-day minutes assignment has thickness 10 a day, so it compares with a 10-page day at weight 1.
- [ ] Mixed lanes (pages + minutes in one child × subject) sum thickness.

## Tests
- `plan.basic.test.ts`: default weights (pages 1, chapters 10, lessons 15) when `weightPerUnit` is null; an explicit weight; minutes ÷ 3.
- `aggregate` tests: weekly average and daily display use thickness, and a lane with two assignments sums them.
- Invariants (`invariants.test.ts`): thickness is finite and ≥ 0 everywhere, and `thickness === units * weight` on every day of every fixture plan. Add this to the existing property loop.
- Adversarial (`tester.adversarial.test.ts`): weight 100 on 100 000 units gives a finite thickness; a weight of NaN or -5 falls back to the default (no NaN in the output).
- `proto-engine.ts` stays frozen; the regression tests compare units only, so adjust any test that compared minutes to compare units.

## Out of scope
- Reading the weight from the DB (S2b-05), the debug view (S2b-12), and removing minutes (S2b-14).
