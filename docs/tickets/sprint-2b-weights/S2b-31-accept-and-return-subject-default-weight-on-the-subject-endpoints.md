# S2b-31 — Accept and return the subject default weight on the subject endpoints

**Depends on:** S2b-30, S2b-01  
**Size:** S

## Goal
`POST` and `PATCH /api/subjects` accept `defaultWeight: { unitType, weightPerUnit } | null`, and every subject response includes it.

## Contract
- **Shape:** `defaultWeight` is `{ unitType, weightPerUnit }` or `null`.
  - `unitType` is any `UNIT_TYPES` value.
  - `weightPerUnit` uses the `WeightPerUnit` bounds from S2b-06 (0.01–100, 2 decimals).
  - `null` clears it. Omitting it on PATCH leaves it unchanged.
  - Partial objects → 400 (strict, RF-09).
- **Response:** `"defaultWeight": { "unitType": "lessons", "weightPerUnit": 20 }` or `null`.
- Changing a subject default **re-thickens** that subject's assignments that have no weight of their own, on the next plan read. This is intended and documented (D20).

## Steps
1. `routes/subjects.ts`: add to the zod schemas, reusing the `WeightPerUnit` validator. Don't copy the bounds (DRY).
2. `repos/subjectRepo.ts` (or the roster repo that serves subjects): map the two columns in `buildUpdateSet` and to JSON.

## Tests (`apps/api/test/subjects-default-weight.test.ts`)
- Create with `{lessons, 20}` → 201, and GET round-trips it.
- PATCH to `{minutes, 0.75}` → 200; PATCH to null → cleared; omitted → unchanged.
- Bad values: weight 0, 101 or 1.234; unit "hours"; a missing key; an extra key → 400.
- Family isolation.
