# S2b-02 — Plan bar thickness from weight in the engine

**Depends on:** S2b-01  
**Size:** M

## Goal
Every planned and past day carries a `thickness` = units × weight, and the lane and week aggregates sum thickness instead of minutes.

## Context
- `planChild` (`plan.ts`) sets `DayLoad.minutes = units * minutesPerUnitOf(a)`.
- `aggregate.ts` (`mergeLane`, `weekSummaries`, `displaySeries`) sums `minutes`, and `DisplayDay.value` is documented as "Minutes drawn for this day (bar thickness)".

This ticket is **additive**: `minutes` and `minutesPerUnit*` stay so the API and web compile, and S2b-14 removes them. Thickness has no unit; it is relative effort, where 1 point ≈ 2 minutes (D1). **Logged hours never come from bars**; they come only from `log_entry.minutes_spent` (S2b-14, S2b-19).

## Steps
1. `types.ts`:
   - Add `thickness: number` to `DayLoad` ("relative effort; units × weight").
   - Add `weightPerUnit: number` and `weightSource: WeightSource` to `ChildPlan`.
   - Add `thickness` to `LaneDay`.
   - `WeekSummary`: add `totalThickness`, and `average` = totalThickness / capacityDays.
   - `DisplayDay.value` becomes thickness, and its comment says so.
2. `plan.ts`: resolve `weightPerUnitOf(a)` once (without a subject default; S2b-32 adds it). Set `thickness: units * weight` on every output day. Don't change how units are planned.
3. `aggregate.ts`: copy, sum and display thickness.
4. Mark each `minutes` field and `minutesPerUnit*` with `@deprecated — removed in S2b-14`.
5. Set `ENGINE_VERSION` to `0.2.0`, with a comment in `version.ts` that pre-1.0 minor bumps are breaking.

## Done when
- [ ] Pages at weight 1.4 × 10 pages a day → thickness 14 a day.
- [ ] A 30-minute-a-day minutes assignment with no weight → thickness 15 a day (30 × 0.5), which matches 15 pages a day at weight 1.
- [ ] Mixed lanes sum thickness.

## Tests
- `plan.basic.test.ts`: the built-ins (1, 10, 15, 0.5) when the weight is null; an explicit weight; an explicit weight on a minutes assignment (30 min × 1 = 30).
- `aggregate` tests: weekly average and daily display use thickness; two assignments in one lane sum.
- `invariants.test.ts`: thickness is finite and ≥ 0, and `thickness === units * weightPerUnit` on every day of every fixture.
- `tester.adversarial.test.ts`: weight 100 × 100 000 units is finite; a weight of NaN or -5 falls back to the built-in.
- `proto-engine.ts` stays frozen; regression tests compare units only.

## Out of scope
- Subject defaults (S2b-32), the DB (S2b-05) and the debug view (S2b-12).
