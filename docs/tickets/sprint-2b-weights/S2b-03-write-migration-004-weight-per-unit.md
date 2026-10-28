# S2b-03 — Write migration 004: weight_per_unit

**Depends on:** none  
**Size:** S

## Goal
`assignment.weight_per_unit` exists with the engine's bounds, existing `minutes_per_unit` values are converted into it, and minutes rows can't carry a weight.

## Context
- `001_init.sql`: `minutes_per_unit numeric(8,2) CHECK (minutes_per_unit >= 0)`, with NULL = unit default.
- RF-10's `003_minutes_unit.sql` added `assignment_minutes_unit_no_mpu` (minutes → NULL).
- This is the **expand** step: the old column and its constraint stay until S2b-15 (migration 006) drops them, after the API and web stop using them, so every commit in between still runs.

## Steps
1. `db/004_weight_per_unit.sql`, in one transaction:
   - `ALTER TABLE assignment ADD COLUMN weight_per_unit numeric(6,2)` (NULL = built-in default for the unit).
   - Add `CONSTRAINT assignment_weight_range CHECK (weight_per_unit IS NULL OR (weight_per_unit >= 0.01 AND weight_per_unit <= 100))`.
   - Add `CONSTRAINT assignment_minutes_no_weight CHECK (unit_type <> 'minutes' OR weight_per_unit IS NULL)`.
   - Backfill (**decision D3**): `UPDATE assignment SET weight_per_unit = LEAST(100, GREATEST(0.01, round(minutes_per_unit / 3.0, 2))) WHERE unit_type <> 'minutes' AND minutes_per_unit > 0`.
     - `minutes_per_unit = 0` and NULL stay NULL (built-in weight).
     - A comment in the SQL explains the conversion: 3 minutes = 1 point (D1).
   - Insert `'004_weight_per_unit'` into `schema_migration`.
2. `db/README.md`: one line for 004, noting it is the expand step of the weight change.
3. `db/test/validate.sql`: a new section with its own fixtures, like RF-10's section 10:
   - 0 → 23514, 100.01 → 23514, minutes + 1 → 23514.
   - 0.01, 100 and NULL are fine.
   - Switching a pages row with a weight to minutes without clearing it → 23514.

## Done when
- [ ] `npm run db:migrate` on a DB at 003 applies only 004; on a fresh DB it applies 001–004.
- [ ] `npm run db:validate` passes.

## Tests (`db/test/weight-migration.test.ts`, scratch DB `hh_weight_migration_test`, same pattern as `minutes-unit.test.ts`)
- Migrate a temp dir holding 001–003, then insert:
  - pages 3 → 1.00
  - pages 4 → 1.33
  - chapters 30 → 10.00
  - lessons 0 → NULL
  - lessons NULL → NULL
  - pages 600 → 100.00 (clamped)
  - pages 0.01 → 0.01 (clamped up from 0.0033)
  - a minutes row → NULL
- Then migrate (only 004 runs) and check `weight_per_unit::float8` for each row.
- The constraints reject the bad values above.

## Out of scope
- Dropping `minutes_per_unit` and the 003 constraint (S2b-15), and the choice history (S2b-04).
