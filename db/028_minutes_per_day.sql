-- 028_minutes_per_day (S20-01, tester M1): the minutes a day the parent entered, kept beside the derived total.
-- The list and the edit form read this number. They do not each round the total a different way.
-- A pages, lessons, or chapters row leaves it null. Existing minutes rows are filled from the total and the
-- school days in the dates (the assignment's days, else the subject's, else the family's), to two decimals.
BEGIN;

ALTER TABLE assignment ADD COLUMN minutes_per_day numeric(8,2);
ALTER TABLE assignment ADD CONSTRAINT assignment_minutes_per_day_range
  CHECK (minutes_per_day IS NULL OR (minutes_per_day > 0 AND minutes_per_day <= 1440));
ALTER TABLE assignment ADD CONSTRAINT assignment_minutes_per_day_unit
  CHECK (unit_type = 'minutes' OR minutes_per_day IS NULL);

UPDATE assignment a
   SET minutes_per_day = round((a.total_units / days.n)::numeric, 2)
  FROM (
    SELECT a2.id,
           (SELECT count(*)::numeric
              FROM generate_series(a2.start_date, a2.end_date, interval '1 day') AS g(d)
             WHERE extract(dow FROM g.d)::int = ANY (COALESCE(a2.weekdays, s.default_weekdays, f.school_days))
           ) AS n
      FROM assignment a2
      JOIN family f ON f.id = a2.family_id
      JOIN subject s ON s.id = a2.subject_id
     WHERE a2.unit_type = 'minutes'
  ) days
 WHERE a.id = days.id AND days.n > 0 AND a.total_units > 0;

INSERT INTO schema_migration (version) VALUES ('028_minutes_per_day');
COMMIT;
