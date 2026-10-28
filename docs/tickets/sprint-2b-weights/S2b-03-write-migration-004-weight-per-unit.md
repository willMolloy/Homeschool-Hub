# S2b-03 — Write migration 004: weight_per_unit

**Depends on:** none  
**Size:** S

## Goal
`assignment.weight_per_unit` exists with the engine's bounds, and existing `minutes_per_unit` values are converted into it at **2 minutes = 1 point**.

## Context
- `001_init.sql` has `minutes_per_unit numeric(8,2) CHECK (>= 0)`, where NULL = the unit's default.
- RF-10's `003_minutes_unit.sql` added `assignment_minutes_unit_no_mpu`.
- This is the **expand** step: the old column and constraint stay until S2b-15 (migration 007) drops them.
- Minutes assignments may now hold a weight (a weight per minute, D21), so this migration adds **no** minutes-specific constraint.

## Steps
1. `db/004_weight_per_unit.sql`, in one transaction:
   - `ALTER TABLE assignment ADD COLUMN weight_per_unit numeric(6,2)`, where NULL = subject default, then built-in.
   - `CONSTRAINT assignment_weight_range CHECK (weight_per_unit IS NULL OR (weight_per_unit >= 0.01 AND weight_per_unit <= 100))`.
   - Backfill (**D3**): `UPDATE assignment SET weight_per_unit = LEAST(100, GREATEST(0.01, round(minutes_per_unit / 2.0, 2))) WHERE unit_type <> 'minutes' AND minutes_per_unit > 0`.
     - 0 and NULL stay NULL.
     - Minutes rows stay NULL (they get the built-in 0.5, so their thickness is unchanged: minutes ÷ 2).
     - A comment in the SQL explains: 2 minutes = 1 point (D1).
   - Insert `'004_weight_per_unit'` into `schema_migration`.
2. `db/README.md`: one line for 004 (expand step).
3. `db/test/validate.sql`: a new section with its own fixtures. 0 → 23514, 100.01 → 23514; 0.01, 100 and NULL are fine; a minutes row with 0.5 is fine.

## Done when
- [ ] Upgrading a DB at 003 applies only 004, and a fresh DB applies 001–004. `db:validate` passes.

## Tests (`db/test/weight-migration.test.ts`, scratch DB `hh_weight_migration_test`, same pattern as `minutes-unit.test.ts`)

Migrate a temp dir holding 001–003, insert these rows, migrate, then check each value:

| Row | Expected weight |
|-----|-----------------|
| pages 3 | 1.50 |
| pages 4 | 2.00 |
| pages 5 | 2.50 |
| chapters 30 | 15.00 |
| lessons 20 | 10.00 |
| lessons 0 | NULL |
| lessons NULL | NULL |
| pages 600 | 100.00 (300, capped) |
| pages 0.01 | 0.01 (0.005, raised to the minimum) |
| minutes | NULL |

## Out of scope
- Dropping the old column (S2b-15), choice history (S2b-04) and subject defaults (S2b-30).
