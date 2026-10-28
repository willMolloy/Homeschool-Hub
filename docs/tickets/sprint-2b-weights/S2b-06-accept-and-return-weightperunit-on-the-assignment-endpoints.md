# S2b-06 — Accept and return weightPerUnit on the assignment endpoints

**Depends on:** S2b-01, S2b-03  
**Size:** S

## Goal
`POST` and `PATCH /api/assignments` accept `weightPerUnit` (on every unit type, minutes included) with the engine's bounds, and every response includes it. The old `minutesPerUnit` input keeps working for now as a translated alias.

## Context
- Bodies are strict (RF-09).
- RF-10 rejects `minutesPerUnit` on minutes assignments. That rule stays for the legacy field. `weightPerUnit` is **allowed** on minutes (a weight per minute, D21).
- The web still sends `minutesPerUnit` until S2b-10, so the API translates it: `weight = clamp(round(mpu / 2, 2))`, using `MINUTES_PER_WEIGHT_POINT`. S2b-13 deletes the alias.

## Steps
1. `http/scheduleLimits.ts`: `WeightPerUnit = bounded("weightPerUnit", MIN_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT, 2, false)`, nullable, using the engine constants.
2. `routes/assignments.ts`:
   - Add `weightPerUnit` to the create and patch schemas.
   - **Unit change on edit (D7):** if `unitType` changes, the stored weight is non-null and the body doesn't send `weightPerUnit` → 400 `invalid_request`, "weightPerUnit: send a weight (or null) when changing unitType." A page weight is meaningless as a lesson or minute weight, so it is never silently carried over. This joins RF-10's unit-change check into one `checkUnitChange` helper.
   - **Legacy alias:**
     - `minutesPerUnit` alone → translated.
     - Both fields → 400 "send weightPerUnit only".
     - `minutesPerUnit` on minutes → 400 (RF-10, unchanged).
     - Mark it with `// TODO(S2b-13)`.
3. `repos/assignmentRepo.ts`: select and update `weight_per_unit`; `toAssignmentJson` adds `weightPerUnit` (number or null). For the transition, the response also includes `minutesPerUnit` = weight × 2, or null, for non-minutes rows.

## Done when
- [ ] Round trip: POST pages with `weightPerUnit: 1.4` → 201, then GET shows 1.4.
- [ ] RF-10's tests are kept for the legacy field. `minutes-unit.test.ts` is renamed `weight-rules.test.ts`, with the weight cases added.

## Tests (`apps/api/test/assignments-weight.test.ts`)
- **Bounds:**
  - 0, -1, 0.001, 100.01, 1e9 and "1.4" → 400.
  - 0.01, 100 and null → 201.
- **Minutes:** `weightPerUnit: 0.75` on minutes → 201, and the plan's thickness is 30 min × 0.75 = 22.5.
- **Unit change** on pages with weight 2:
  - `{unitType: "chapters"}` → 400.
  - `{unitType: "chapters", weightPerUnit: 12}` → 200.
  - `{unitType: "minutes", weightPerUnit: null}` → 200 (the plan uses the subject default or 0.5).
  - A unit change on a NULL-weight row with no weight sent → 200.
- **Legacy:** `minutesPerUnit: 6` stores 3; both fields → 400.
- A title or archive edit leaves the weight unchanged.

## Out of scope
- Choices (S2b-07), subject defaults (S2b-31) and the form (S2b-10).
