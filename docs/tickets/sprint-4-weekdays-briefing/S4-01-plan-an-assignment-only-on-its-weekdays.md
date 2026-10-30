# S4-01 — Plan an assignment only on its weekdays in the engine

**Source:** ROADMAP.md, "Assignment weekdays"  
**Depends on:** none  
**Size:** M

## Goal
The engine places an assignment's work only on its weekdays: its own, else its subject's default, else every school day.

## Context
- Today every assignment is spread over all school days, so a once-a-week subject shows as a fifth of a lesson every day.
- `planChild` reads capacity per day through `c(d)` (`plan.ts`), from `buildCapacityModel` (`capacity.ts`). Overrides and check-ins replan through the same `c`.
- Subject effort defaults already reach the engine as `ctx.subjectWeights`; weekday defaults follow the same pattern.
- Weekdays are 0 = Sunday … 6 = Saturday (`Weekday` in `types.ts`).

## Steps
1. `Assignment` gains `weekdays?: Weekday[] | null` (null or missing = no own choice). `PlanContext` gains `subjectWeekdays?: { subjectId: string; weekdays: Weekday[] }[]`.
2. Add a pure `weekdaysOf(a, ctx)` returning `{ weekdays: Weekday[] | null; source: "assignment" | "subject" | "default" }`. An empty or invalid list counts as no choice.
3. In `planChild`, a day whose weekday is not in the resolved list has capacity 0 for this assignment. Everything else (events, days off, overrides, check-ins) works on top as now.
4. Output: `ChildPlan` gains `weekdays` (the resolved list or null) and `weekdaysSource`.
5. Bump `ENGINE_VERSION` (minor).

## Done when
- An assignment on Fridays only places all its work on Fridays; Monday–Thursday have 0 units and 0 thickness.
- An assignment with no own weekdays follows its subject's; with neither, the plan is exactly as before (existing tests pass unchanged).
- If none of its weekdays are school days, the plan reports `no-capacity` as it does today for an assignment with no capacity.
- Results don't depend on the time zone.

## Tests
- Engine unit tests: Friday-only (12 lessons over 12 weeks → 1 per Friday); Mon–Thu math; subject default used; assignment overrides subject; empty list ignored; weekdays with no school days → `no-capacity`; a Friday day off with a Friday-only assignment spreads that lesson over the remaining Fridays (keep end date, as days off do today); a check-in on a Tue/Thu assignment replans onto Tue/Thu only; a Tue/Thu assignment with a Tuesday event set to skip and one set to lighter; a shared assignment for two children where one child has a day off; a week override on a Fridays-only assignment spreads only over that week's Friday.
- `npm run test:tz` passes.

## Out of scope
- Storing or loading weekdays (S4-02 to S4-05).
