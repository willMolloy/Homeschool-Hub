# S2b-19 — Stop loading logs into the plan

**Depends on:** S2b-18  
**Size:** XS

## Goal
`/api/plan` no longer reads `log_entry`/`log_child_progress`, and the engine drops `ProgressEntry`.

## Steps
1. `apps/api/src/plan/loadPlanInputs.ts`: delete the progress query and its mapping, and its test cases in `load-plan-inputs.test.ts`.
2. Engine: delete `ProgressEntry` and `PlanContext.progress`, and remove them from `index.ts`.
3. Leave the log tables and data untouched. They remain the source for **hour totals and exports** (a future logging sprint). Add a comment on `log_entry` in `db/README.md`: "Feeds hours and exports only; never the plan (S2b-18)."

## Done when
- [ ] `rg -n "progress" apps/api/src/plan packages/engine/src` finds only the actual-progress code from S2b-20 (or nothing, before it lands).

## Tests
- A plan for a family with log rows equals the plan with those rows deleted.

## Out of scope
- Any logging UI.
