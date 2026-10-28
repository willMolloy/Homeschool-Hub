# S2b-30 — Write migration 006: subject default weight

**Depends on:** S2b-03  
**Size:** XS

## Goal
A subject can store an optional default bar width: a weight per unit for one unit type.

## Context
For non-objective work, such as math lessons or minutes, a child's history doesn't carry over, so DeeDee wants the parent to set the bar width on the subject. New assignments in that subject (of that unit type) default to it, and assignments without their own weight follow it (D20).

## Steps
1. `db/006_subject_default_weight.sql`:
   ```sql
   ALTER TABLE subject
     ADD COLUMN default_weight_unit text CHECK (default_weight_unit IN ('pages', 'chapters', 'lessons', 'minutes')),
     ADD COLUMN default_weight numeric(6,2) CHECK (default_weight IS NULL OR (default_weight >= 0.01 AND default_weight <= 100)),
     ADD CONSTRAINT subject_default_weight_pair CHECK ((default_weight IS NULL) = (default_weight_unit IS NULL));
   ```
   - Both NULL = no subject default.
   - The unit is stored because a weight only means something per unit (20 per lesson ≠ 20 per page) (**D23**).
2. Add the `schema_migration` row and a db README line. RF-08 enum test: `default_weight_unit` = `UNIT_TYPES`.
3. `db:validate` section:
   - The weight without a unit, or the unit without a weight → 23514.
   - 0 → 23514; 100.01 → 23514.
   - (lessons, 20) is fine.

## Tests
- `db/test/subject-weight-migration.test.ts`: an upgrade from 005 leaves existing subjects NULL, and the constraints hold.
