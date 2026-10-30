# S4-08 — Add finish-forecast and heavy-week helpers to the engine

**Source:** ROADMAP.md, "Weekly briefing on This Week, with finish-date forecasts"  
**Depends on:** S4-01  
**Size:** S

## Goal
The engine has pure helpers that say when an assignment will finish at the child's actual pace, and whether a week is heavy for a child.

## Context
- The plan assumes scheduled work was done (S2b-18). Only check-ins (`ChildPlan.checkInWeeks`, `doneUnits`) show a different pace.
- `weeklySummary` in `aggregate.ts` gives weekly loads.

## Steps
1. `forecastFinish(plan: ChildPlan, checkIns, calendar)`: if the child has at least 2 check-in weeks for this assignment and their pace over those weeks is below the planned pace, return the projected finish date at that pace (remaining units ÷ observed units per capacity-day, placed on the assignment's own days); otherwise return null. Never NaN or Infinity.
2. `heavyWeek(childPlans, weekStart, calendar)`: the child's load that week (summed thickness) compared with their average weekly load over the weeks that have any planned work; returns `{ load, average, ratio }`. A week counts as heavy at `ratio >= 1.5` (a named constant, `HEAVY_WEEK_RATIO`).

## Done when
- Both helpers are pure, exported from `@hh/engine`, and documented with the ticket id.

## Tests
- Engine unit tests: on pace → null; one check-in only → null; behind over 2 weeks → a later date; ahead → null; zero progress over 2 weeks → null plus no crash (reported as "no recent progress" by the caller); a week at 2× average → ratio 2; a child with no work → no division by zero. `test:tz` passes.

## Out of scope
- UI (S4-09).
