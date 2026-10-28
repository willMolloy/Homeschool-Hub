# S2b-05 — Read weight_per_unit into the plan

**Depends on:** S2b-02, S2b-03  
**Size:** XS

## Goal
`/api/plan` uses each assignment's stored weight, so the bars reflect what the parent set.

## Steps
1. `apps/api/src/plan/loadPlanInputs.ts`: select `weight_per_unit` and map it to `weightPerUnit` (number or null), the same way `minutes_per_unit` is mapped today. Keep `minutesPerUnit` until S2b-13.
2. `db/seed.ts` and `db/demo.ts`: write `weight_per_unit` for the sample family. Engine fixtures that have a `minutesPerUnit` get `weightPerUnit = round(mpu / 2, 2)`, following D3 (2 minutes = 1 point). Leave the old column as it is.
3. `/api/plan` passes the new `ChildPlan` fields through unchanged (`weightPerUnit`, `weightSource`, `days[].thickness`).

## Done when
- [ ] `/api/plan` for the demo family returns `thickness` on every day and `weightSource: "assignment"` where a weight is stored.

## Tests
- `load-plan-inputs.test.ts`: a stored 1.4 maps to 1.4; NULL maps to null; a minutes row with 0.75 maps to 0.75.
- `plan-contract.test.ts`: the new fields exist and are finite, and `thickness === units * weightPerUnit` on each day. A minutes row with a NULL weight shows `weightPerUnit` 0.5 and source `default`.

## Out of scope
- Writes (S2b-06).
