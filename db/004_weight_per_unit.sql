-- 004_weight_per_unit (S2b-03): a relative weight per unit replaces minutes per unit (expand step).
-- Bar thickness = units/day x weight. NULL = the subject default, then the built-in.
-- minutes_per_unit and RF-10's assignment_minutes_unit_no_mpu stay until 007 drops them.
-- Minutes assignments may carry a weight (a weight per minute, D21), so there is no minutes-specific CHECK.
BEGIN;

ALTER TABLE assignment ADD COLUMN weight_per_unit numeric(6,2);
ALTER TABLE assignment ADD CONSTRAINT assignment_weight_range
  CHECK (weight_per_unit IS NULL OR (weight_per_unit >= 0.01 AND weight_per_unit <= 100));

-- D1: 2 minutes = 1 point, so a stored minutes-per-unit converts at / 2, kept inside the bounds (D3).
-- 0 and NULL stay NULL (the default). Minutes rows stay NULL: their built-in 0.5 already equals minutes / 2.
UPDATE assignment
   SET weight_per_unit = LEAST(100, GREATEST(0.01, round(minutes_per_unit / 2.0, 2)))
 WHERE unit_type <> 'minutes' AND minutes_per_unit > 0;

INSERT INTO schema_migration (version) VALUES ('004_weight_per_unit');
COMMIT;
