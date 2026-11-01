-- 013_undo (S6-05): what an assignment looked like when it was created (reset, S6-07), and one "last change" per family
-- that can be undone (S6-06).
-- assignment.original is { title, subjectId, unitType, totalUnits, weightPerUnit, weekdays, startDate, endDate, childIds }.
-- Existing rows get their current values; it stays NULL only for a row inserted outside the API.
-- undo_entry holds at most one row per family (the primary key): the label to show and the inverse to apply, as JSON the API reads.
BEGIN;

ALTER TABLE assignment ADD COLUMN original jsonb;
ALTER TABLE assignment ADD CONSTRAINT assignment_original_object
  CHECK (original IS NULL OR jsonb_typeof(original) = 'object');

UPDATE assignment a
   SET original = jsonb_build_object(
         'title', a.title,
         'subjectId', a.subject_id,
         'unitType', a.unit_type,
         'totalUnits', a.total_units,
         'weightPerUnit', a.weight_per_unit,
         'weekdays', to_jsonb(a.weekdays),
         'startDate', to_char(a.start_date, 'YYYY-MM-DD'),
         'endDate', to_char(a.end_date, 'YYYY-MM-DD'),
         'childIds', COALESCE((SELECT jsonb_agg(ac.child_id ORDER BY c.sort_order, c.id)
                                 FROM assignment_child ac JOIN child c ON c.id = ac.child_id
                                WHERE ac.assignment_id = a.id), '[]'::jsonb));

CREATE TABLE undo_entry (
  family_id   uuid PRIMARY KEY REFERENCES family (id) ON DELETE CASCADE,
  label       text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 300),
  inverse     jsonb NOT NULL CONSTRAINT undo_entry_inverse_object CHECK (jsonb_typeof(inverse) = 'object'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migration (version) VALUES ('013_undo');
COMMIT;
