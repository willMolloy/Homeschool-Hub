-- 009_missed_kind (S4-00): a day off of kind 'missed' is a past day the family did not do. The engine keeps the
-- plan before it as it was and carries that day's work forward (the other kinds spread it over the whole range).
-- 001 named the CHECK implicitly, so its name is the Postgres default.
BEGIN;

ALTER TABLE blocked_range DROP CONSTRAINT blocked_range_kind_check;
ALTER TABLE blocked_range ADD CONSTRAINT blocked_range_kind_check
  CHECK (kind IN ('vacation', 'holiday', 'sick', 'other', 'missed'));

INSERT INTO schema_migration (version) VALUES ('009_missed_kind');
COMMIT;
