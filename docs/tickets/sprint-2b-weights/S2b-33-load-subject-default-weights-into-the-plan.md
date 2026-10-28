# S2b-33 — Load subject default weights into the plan

**Depends on:** S2b-31, S2b-32  
**Size:** XS

## Goal
`/api/plan` passes each subject's default weight to the engine.

## Steps
1. `loadPlanInputs.ts`: select `default_weight_unit` and `default_weight` from the family's subjects (archived ones included, because their assignments can still be planned), and map them to `ctx.subjectWeights`.

## Tests
- `load-plan-inputs.test.ts`: the mapping, NULLs skipped, family isolation.
- `plan-contract.test.ts`: `weightSource: "subject"` appears for the demo subject that has a default. Give `db/demo.ts` one: Math, lessons 20.
