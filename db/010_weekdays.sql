-- 010_weekdays (S4-02): an assignment's own weekdays and a subject's default weekdays (0 = Sunday ... 6 = Saturday).
-- NULL = no choice: an assignment then follows its subject's days, and with neither it runs on every school day.
-- Same rule as family.school_days (001), plus non-empty and no repeats. Existing rows get NULL (no change).
-- valid_weekdays is a plain function so S4-01b can reuse it for assignment.previous_weekdays.
BEGIN;

CREATE FUNCTION valid_weekdays(w smallint[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$
    SELECT w IS NULL OR (
      cardinality(w) BETWEEN 1 AND 7
      AND array_position(w, NULL) IS NULL
      AND w <@ '{0,1,2,3,4,5,6}'::smallint[]
      -- distinct: the number of different days present equals the length
      AND cardinality(w) = (w @> '{0}')::int + (w @> '{1}')::int + (w @> '{2}')::int + (w @> '{3}')::int
                         + (w @> '{4}')::int + (w @> '{5}')::int + (w @> '{6}')::int
    )
  $$;

ALTER TABLE assignment
  ADD COLUMN weekdays smallint[] CONSTRAINT assignment_weekdays_valid CHECK (valid_weekdays(weekdays));
ALTER TABLE subject
  ADD COLUMN default_weekdays smallint[] CONSTRAINT subject_default_weekdays_valid CHECK (valid_weekdays(default_weekdays));

INSERT INTO schema_migration (version) VALUES ('010_weekdays');
COMMIT;
