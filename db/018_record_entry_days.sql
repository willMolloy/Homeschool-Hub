-- 018_record_entry_days (S9b-07): the days a run of dates counts, as the parent ticked them.
--   days  NULL: the entry counts the school calendar's days in its dates (S9b-01: the family's school weekdays less days off),
--         which is how every entry saved before S9b-07, and every single-day entry, is read.
--         A list of dates: a run of dates counts exactly these (the API keeps them sorted, distinct and inside the run).
-- Only a run of dates (start_date < end_date) can carry a list; a single day always counts itself (with the switch).
BEGIN;

ALTER TABLE record_entry ADD COLUMN days date[];
ALTER TABLE record_entry ADD CONSTRAINT record_entry_days_run
  CHECK (days IS NULL OR (start_date < end_date AND cardinality(days) <= end_date - start_date + 1));

INSERT INTO schema_migration (version) VALUES ('018_record_entry_days');
COMMIT;
