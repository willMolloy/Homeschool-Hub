# S2b-22 — Load check-ins into the plan

**Depends on:** S2b-20, S2b-21  
**Size:** XS

## Goal
`/api/plan` passes the family's stored check-ins to the engine.

## Steps
1. `loadPlanInputs.ts`: one family-scoped query on `progress_checkin` mapped to `ProgressCheckIn[]` (`position` as a number). Skip archived children, matching how the loader treats children today.
2. `/api/plan` passes through the new fields: `position`, `finishedEarly` and `checkInWeeks`.

## Tests
- `load-plan-inputs.test.ts`: the mapping, family isolation, and archived children skipped.
- `plan-contract.test.ts`: `position` is finite and non-decreasing.
