# S2b-06 — Accept and return weightPerUnit on the assignment endpoints

**Depends on:** S2b-01, S2b-03  
**Size:** S

## Goal
`POST` and `PATCH /api/assignments` accept `weightPerUnit` with the engine's bounds, every assignment response includes it, and the old `minutesPerUnit` input keeps working for now as a translated legacy alias.

## Context
- Bodies are strict (RF-09), so a new key must be added to the zod schema.
- RF-10 rejects `minutesPerUnit` on minutes assignments with a 400; this ticket applies the same rule to weights.
- The web still sends `minutesPerUnit` until S2b-10. To keep the app working at every commit, the API translates it: `weight = clamp(round(mpu / 3, 2))`, using `MINUTES_PER_WEIGHT_POINT`. S2b-13 deletes the alias.

## Steps
1. `http/scheduleLimits.ts`: `WeightPerUnit = bounded("weightPerUnit", MIN_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT, 2, false)`, nullable. Use the engine constants, not new literals.
2. `routes/assignments.ts`:
   - Add `weightPerUnit` to the create and patch schemas.
   - Rename RF-10's `checkMinutesUnit` to `checkWeightFits(unitType, weight, switching)`. Minutes + a non-null weight → 400 `invalid_request`, "weightPerUnit: doesn't apply to minutes; leave it empty."
   - **Unit change on edit (decision D7):**
     - If `unitType` changes and the stored weight is non-null and the body doesn't send `weightPerUnit` → 400: "weightPerUnit: send a weight (or null) when changing unitType." A page weight is meaningless as a chapter weight, so it is never carried over silently.
     - This replaces RF-10's message for the minutes case, and applies to every unit change.
   - Legacy alias: if `minutesPerUnit` is present and `weightPerUnit` isn't, translate it. Both present → 400 "send weightPerUnit only". A `// TODO(S2b-13)` marks it.
3. `repos/assignmentRepo.ts`: add the `weight_per_unit` column to SELECT and to the `buildUpdateSet` record; `toAssignmentJson` adds `weightPerUnit` (number or null). For now the response still includes `minutesPerUnit`, derived as weight × 3 (or null), so the current web card text keeps working.

## Done when
- [ ] Round trip: POST pages with `weightPerUnit: 1.4` → 201, then GET shows 1.4.
- [ ] RF-10's tests are updated to the weight wording, and `apps/api/test/minutes-unit.test.ts` is renamed to `weight-rules.test.ts`.

## Tests (`apps/api/test/assignments-weight.test.ts`)
- **Bounds:**
  - 0 → 400
  - -1 → 400
  - 0.001 → 400 (3 decimals)
  - 100.01 → 400
  - 1e9 → 400
  - "1.4" (a string) → 400
  - 0.01 → 201
  - 100 → 201
  - null → 201 (the response shows null; the plan shows the default)
- **Minutes:** a weight on minutes → 400, and nothing is inserted.
- **Unit change** on a pages assignment with weight 2:
  - `{unitType: "chapters"}` → 400
  - `{unitType: "chapters", weightPerUnit: 12}` → 200
  - `{unitType: "minutes", weightPerUnit: null}` → 200
  - `{unitType: "lessons", weightPerUnit: null}` → 200, and the plan uses 15.
  - Unit change on a row with a NULL weight and no weight sent → 200.
- **Legacy:** `minutesPerUnit: 6` stores 2; both fields → 400; `minutesPerUnit` on minutes → 400 (unchanged).
- Other edits to a weighted row (title or archive alone) → 200, with the weight unchanged.

## Out of scope
- Recording choices (S2b-07) and the web form (S2b-10).
