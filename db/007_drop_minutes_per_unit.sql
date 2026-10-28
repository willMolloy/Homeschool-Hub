-- 007_drop_minutes_per_unit (S2b-15): the contract step of the weight change. Bars use weight_per_unit
-- (004, backfilled from minutes_per_unit ÷ 2) and nothing reads or writes minutes_per_unit since S2b-13,
-- so the column and RF-10's 003 constraint on it go. Time spent comes only from log_entry.minutes_spent.
BEGIN;

-- Explicit, even though dropping the column would take the constraint with it.
ALTER TABLE assignment DROP CONSTRAINT IF EXISTS assignment_minutes_unit_no_mpu;
ALTER TABLE assignment DROP COLUMN minutes_per_unit;

INSERT INTO schema_migration (version) VALUES ('007_drop_minutes_per_unit');
COMMIT;
