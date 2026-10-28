# S2b-15 — Write migration 007: drop minutes_per_unit

**Depends on:** S2b-13, S2b-30  
**Size:** XS

## Goal
The **contract** step: `minutes_per_unit` and RF-10's 003 constraint are removed cleanly.

## Steps
1. `db/007_drop_minutes_per_unit.sql`:
   - `ALTER TABLE assignment DROP CONSTRAINT IF EXISTS assignment_minutes_unit_no_mpu;` (explicit, even though dropping the column would take it with it).
   - `ALTER TABLE assignment DROP COLUMN minutes_per_unit;`
   - Insert into `schema_migration`.
   - Number 006 belongs to the subject default (S2b-30), which lands first.
2. Don't touch older migrations; add a db README note instead.
3. `db/test/validate.sql`: remove RF-10's section 10 (its column is gone). `db/test/minutes-unit.test.ts` still runs, because it migrates a temp dir holding only 001–003; add a comment saying so.
4. `db/seed.ts` and `db/demo.ts`: drop `minutes_per_unit` from the INSERTs.

## Done when
- [ ] A fresh migrate (001–007) and the 003 → 007 upgrade both pass `db:validate`.
- [ ] `rg minutes_per_unit db apps packages` finds only historical migrations and tests.

## Tests
- `db/test/drop-mpu.test.ts`: migrate to 006 with data, apply 007, and check the column is gone with weights and subject defaults untouched.
