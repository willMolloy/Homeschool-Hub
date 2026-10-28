-- 006_subject_default_weight (S2b-30): a subject's optional default bar width, a weight per unit for
-- one unit type (D20, D23). 20 per lesson isn't 20 per page, so the unit is stored with the weight.
-- Both NULL = no subject default; assignments without their own weight then use the built-in.
BEGIN;

ALTER TABLE subject
  ADD COLUMN default_weight_unit text
    CONSTRAINT subject_default_weight_unit CHECK (default_weight_unit IN ('pages', 'chapters', 'lessons', 'minutes')),
  ADD COLUMN default_weight numeric(6,2)
    CONSTRAINT subject_default_weight_range CHECK (default_weight IS NULL OR (default_weight >= 0.01 AND default_weight <= 100)),
  ADD CONSTRAINT subject_default_weight_pair CHECK ((default_weight IS NULL) = (default_weight_unit IS NULL));

INSERT INTO schema_migration (version) VALUES ('006_subject_default_weight');
COMMIT;
