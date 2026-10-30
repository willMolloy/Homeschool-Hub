# S4-05 — Load weekdays into the plan

**Source:** ROADMAP.md, "Assignment weekdays"  
**Depends on:** S4-01, S4-03, S4-04  
**Size:** S

## Goal
`GET /api/plan` passes assignment weekdays and subject default weekdays to the engine, so the timeline and This Week show work only on those days.

## Context
- `plan/loadPlanInputs.ts` builds the engine inputs, including `subjectWeights` from subjects. Add weekdays the same way.

## Steps
1. Map `assignment.weekdays` to `Assignment.weekdays` and `subject.default_weekdays` to `ctx.subjectWeekdays` (archived subjects included, as for weights).
2. Pass the new `weekdays` and `weekdaysSource` through the plan response.

## Done when
- With a Friday-only assignment in the database, `/api/plan` shows its units on Fridays only; with none set, the plan is unchanged.

## Tests
- API integration (`load-plan-inputs.test.ts`, `plan.test.ts`): Friday-only assignment; subject default followed; subject default changed → an uncustomised assignment follows it, a customised one doesn't. Update the plan contract snapshot if needed and say why in the commit.

## Out of scope
- UI.
