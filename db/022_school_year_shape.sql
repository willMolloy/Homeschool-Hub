-- 022_school_year_shape (S11b-01): the shape the parent chose for the school year (Fall and Spring, three terms, 36 weeks, 6 on 1 off),
-- so going Back to the step, or opening it from Set up, shows what they chose. NULL for a year given before this (the screen then
-- shows Fall and Spring) and while there is no year.
BEGIN;

ALTER TABLE family ADD COLUMN school_year_shape text;
ALTER TABLE family ADD CONSTRAINT family_school_year_shape_values
  CHECK (school_year_shape IS NULL OR school_year_shape IN ('fall-spring', 'three-terms', '36-weeks', 'sabbath'));

INSERT INTO schema_migration (version) VALUES ('022_school_year_shape');
COMMIT;
