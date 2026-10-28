-- 003_minutes_unit (RF-10): a `minutes` assignment has no minutes-per-unit (one unit IS one minute).
-- The engine always ignored the stored value, so clearing it changes no plan.
BEGIN;

UPDATE assignment SET minutes_per_unit = NULL WHERE unit_type = 'minutes' AND minutes_per_unit IS NOT NULL;

ALTER TABLE assignment
  ADD CONSTRAINT assignment_minutes_unit_no_mpu CHECK (unit_type <> 'minutes' OR minutes_per_unit IS NULL);

INSERT INTO schema_migration (version) VALUES ('003_minutes_unit');
COMMIT;
