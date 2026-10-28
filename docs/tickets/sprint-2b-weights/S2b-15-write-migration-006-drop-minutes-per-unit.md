# S2b-15 — Write migration 006: drop minutes_per_unit

**Depends on:** S2b-13  
**Size:** XS

## Goal
The **contract** step: `minutes_per_unit` and RF-10's 003 constraint are removed cleanly.

## Steps
1. `db/006_drop_minutes_per_unit.sql`:
   - `ALTER TABLE assignment DROP CONSTRAINT IF EXISTS assignment_minutes_unit_no_mpu;` (explicit, even though dropping the column would take it).
   - `ALTER TABLE assignment DROP COLUMN minutes_per_unit;`
   - Insert into `schema_migration`.
2. Update the comment in `001_init.sql`? **No.** Migrations are immutable. Add a note in the db README instead.
3. `db/test/validate.sql`: remove RF-10's section 10 (its column is gone); S2b-03's weight section covers the minutes rule. `db/test/minutes-unit.test.ts` still runs, because it migrates a temp dir that only holds migrations below 004; add a comment saying so.
4. `db/seed.ts` and `db/demo.ts`: drop the `minutes_per_unit` column from their INSERTs.

## Done when
- [ ] Fresh migrate (001–006) and the 003 → 006 upgrade both pass `db:validate`.
- [ ] `rg minutes_per_unit db apps packages` finds only historical migrations and tests.

## Tests
- `db/test/drop-mpu.test.ts`: migrate to 005 with data, apply 006, and check the column is gone and the weights are untouched.

## Out of scope
- Rewriting old migrations.
