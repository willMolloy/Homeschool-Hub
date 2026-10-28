-- 008_progress_checkin (S2b-21): parent-confirmed actual progress per assignment, child and week, and whether
-- the family reviewed or skipped a week. "Went as planned" stores no progress_checkin row (no row = as planned).
-- position <= total_units is checked in the API (S2b-24), not here: the total can be edited and the engine clamps.
BEGIN;

CREATE TABLE progress_checkin (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      uuid NOT NULL,
  assignment_id  uuid NOT NULL,
  child_id       uuid NOT NULL,
  week_start     date NOT NULL,
  position       numeric(10,2) NOT NULL CHECK (position >= 0),
  mode           text CHECK (mode IN ('keepEndDate', 'pushEndDate')), -- NULL = on plan
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, child_id, week_start),
  FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE
);
CREATE INDEX progress_checkin_family_idx ON progress_checkin (family_id, assignment_id, child_id, week_start);

-- What makes the "How did last week go?" card go away (it never nags), synced across devices.
CREATE TABLE week_review (
  family_id   uuid NOT NULL REFERENCES family (id) ON DELETE CASCADE,
  week_start  date NOT NULL,
  status      text NOT NULL CHECK (status IN ('reviewed', 'skipped')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, week_start)
);

INSERT INTO schema_migration (version) VALUES ('008_progress_checkin');
COMMIT;
