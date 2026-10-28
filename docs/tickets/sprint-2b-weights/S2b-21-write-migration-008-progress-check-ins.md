# S2b-21 — Write migration 008: progress check-ins

**Depends on:** none  
**Size:** S

## Goal
Tables to store parent-confirmed actual progress per assignment, child and week, plus whether the family reviewed or skipped a week.

## Steps
1. `db/008_progress_checkin.sql`:
   ```sql
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

   CREATE TABLE week_review (
     family_id   uuid NOT NULL REFERENCES family (id) ON DELETE CASCADE,
     week_start  date NOT NULL,
     status      text NOT NULL CHECK (status IN ('reviewed', 'skipped')),
     updated_at  timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (family_id, week_start)
   );
   ```
   - "Last week went as planned" and untouched rows store **no** `progress_checkin` row (no row = as planned). Only changed positions are stored, which keeps the data small and edits simple.
   - `week_review` is what makes the card disappear (it never nags) and syncs across devices.
2. `schema_migration` row, a db README line, and an RF-08 enum test for `mode` against `OVERRIDE_MODES` and for `status`.
3. `db:validate` section: a negative position → 23514, a duplicate (assignment, child, week) → 23505, a foreign child → 23503, a bad mode → 23514.

## Done when
- [ ] Fresh migrate and the upgrade from 007 both pass.

## Tests
- `db/test/checkin-migration.test.ts`: the constraints, and the cascade on assignment delete.

## Out of scope
- `position <= total_units` is checked in the API (S2b-24), not the DB, because the total can be edited later and the engine clamps.
