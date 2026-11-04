-- 020_school_year (S11-03): the school year's first and last day, as the parent gave them in the setup flow.
-- Both are NULL until given (a family that chose "I'll set this later", or one from before the flow); then both are set and the
-- last day is not before the first. Used to resume the flow's breaks step and to offer the year's holidays; the year's shape
-- is applied as ordinary days off and zoom views, so nothing else reads these.
BEGIN;

ALTER TABLE family ADD COLUMN school_year_start date;
ALTER TABLE family ADD COLUMN school_year_end date;
ALTER TABLE family ADD CONSTRAINT family_school_year_range
  CHECK ((school_year_start IS NULL AND school_year_end IS NULL)
      OR (school_year_start IS NOT NULL AND school_year_end IS NOT NULL AND school_year_end >= school_year_start));

INSERT INTO schema_migration (version) VALUES ('020_school_year');
COMMIT;
