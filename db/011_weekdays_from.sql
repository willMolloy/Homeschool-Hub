-- 011_weekdays_from (S4-01b): when an assignment that has already started changes its effective weekdays, the engine keeps
-- the plan before the change. weekdays_from is the first day the new days apply (the start of the family's current week);
-- previous_weekdays is what applied before (NULL = every school day). One level of history: a later change overwrites both.
-- Both NULL for existing rows (no change in behaviour). previous_weekdays follows 010's rule and only makes sense with a date.
BEGIN;

ALTER TABLE assignment
  ADD COLUMN weekdays_from date,
  ADD COLUMN previous_weekdays smallint[] CONSTRAINT assignment_previous_weekdays_valid CHECK (valid_weekdays(previous_weekdays)),
  ADD CONSTRAINT assignment_previous_weekdays_need_date CHECK (previous_weekdays IS NULL OR weekdays_from IS NOT NULL);

INSERT INTO schema_migration (version) VALUES ('011_weekdays_from');
COMMIT;
