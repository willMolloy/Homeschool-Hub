-- 016_log_setup (S9-03): what a family's records track, and which subjects are core.
-- family.log_setup is NULL until the family picks a template style in Records; then it is a JSON object
-- { "template": ..., "fields": { subjectHours, coreSplit, totalHours, schoolDays, homeAway, notes, books } }.
-- The database checks only that it is an object; the API checks what is in it. Changing it never touches logged data
-- (S9-07): it only decides which fields the log form, the totals and the exports show.
-- subject.core: core (true) or non-core (false, the default) for the core / non-core hours totals.
BEGIN;

ALTER TABLE family ADD COLUMN log_setup jsonb;
ALTER TABLE family ADD CONSTRAINT family_log_setup_shape
  CHECK (log_setup IS NULL OR (jsonb_typeof(log_setup) = 'object' AND coalesce(jsonb_typeof(log_setup -> 'fields'), '') = 'object'));

ALTER TABLE subject ADD COLUMN core boolean NOT NULL DEFAULT false;

INSERT INTO schema_migration (version) VALUES ('016_log_setup');
COMMIT;
