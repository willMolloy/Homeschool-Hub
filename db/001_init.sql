-- 001_init.sql — Homeschool Hub initial schema (PostgreSQL 13+; validated on 18).
--
-- Conventions
--  * All ids are uuid. log_entry.id is generated on the CLIENT (offline-first) so a retried
--    sync is idempotent: INSERT ... ON CONFLICT (id) DO NOTHING.
--  * Calendar dates are DATE (a local calendar day, no time zone). Never store them as timestamps.
--  * Every child table carries family_id and uses composite foreign keys, so a row can never
--    point at another family's child/subject/assignment.
--  * Engine output (rate, per-day load) is NEVER stored. It is recomputed from these rows.
--  * Weekdays are 0 = Sunday ... 6 = Saturday (same as @hh/engine).

BEGIN;

CREATE TABLE schema_migration (
  version     text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- family
CREATE TABLE family (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL CHECK (length(btrim(name)) > 0),
  -- The one definition of "a week" for overrides and the weekly view.
  week_start   text NOT NULL DEFAULT 'mon' CHECK (week_start IN ('mon', 'sun')),
  -- School weekdays, default Mon-Fri.
  school_days  smallint[] NOT NULL DEFAULT '{1,2,3,4,5}'
               CHECK (school_days <@ '{0,1,2,3,4,5,6}'::smallint[] AND array_position(school_days, NULL) IS NULL),
  -- IANA zone used only to decide what "today" is; dates themselves are local DATEs.
  time_zone    text NOT NULL DEFAULT 'America/Chicago',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- child
CREATE TABLE child (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (length(btrim(name)) > 0),
  color        text,
  sort_order   integer NOT NULL DEFAULT 0,
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_id)
);
CREATE INDEX child_family_idx ON child (family_id);

-- ---------------------------------------------------------------- subject
CREATE TABLE subject (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name         text NOT NULL CHECK (length(btrim(name)) > 0),
  color        text,
  sort_order   integer NOT NULL DEFAULT 0,
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_id)
);
CREATE UNIQUE INDEX subject_family_name_uq ON subject (family_id, lower(btrim(name))) WHERE archived_at IS NULL;

-- ---------------------------------------------------------------- assignment
CREATE TABLE assignment (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id         uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  subject_id        uuid NOT NULL,
  title             text NOT NULL CHECK (length(btrim(title)) > 0),
  unit_type         text NOT NULL CHECK (unit_type IN ('pages', 'chapters', 'lessons', 'minutes')),
  total_units       numeric(10,2) NOT NULL CHECK (total_units >= 0),
  start_date        date NOT NULL,
  end_date          date NOT NULL,
  -- NULL = use the unit default (pages 2, chapters 30, lessons 20, minutes 1); UI shows "estimated".
  minutes_per_unit  numeric(8,2) CHECK (minutes_per_unit >= 0),
  archived_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  UNIQUE (id, family_id),
  FOREIGN KEY (subject_id, family_id) REFERENCES subject (id, family_id)
);
CREATE INDEX assignment_family_dates_idx ON assignment (family_id, start_date, end_date);

-- Which children do an assignment. A shared assignment (history for both kids) has several rows;
-- each child gets their own plan and progress.
CREATE TABLE assignment_child (
  assignment_id  uuid NOT NULL,
  child_id       uuid NOT NULL,
  family_id      uuid NOT NULL,
  PRIMARY KEY (assignment_id, child_id),
  FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE
);
CREATE INDEX assignment_child_child_idx ON assignment_child (child_id);

-- ---------------------------------------------------------------- recurring events
CREATE TABLE event (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id          uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name               text NOT NULL CHECK (length(btrim(name)) > 0),
  weekdays           smallint[] NOT NULL
                     CHECK (cardinality(weekdays) > 0 AND weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]
                            AND array_position(weekdays, NULL) IS NULL),
  start_date         date,
  end_date           date,
  capacity_fraction  numeric(4,3) NOT NULL DEFAULT 0.5 CHECK (capacity_fraction BETWEEN 0 AND 1),
  -- Rule for subjects with no row in event_subject_rule.
  default_rule       text NOT NULL DEFAULT 'normal' CHECK (default_rule IN ('skip', 'lighter', 'normal')),
  archived_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  UNIQUE (id, family_id)
);

-- Children the event takes time from. No rows = the whole family.
CREATE TABLE event_child (
  event_id   uuid NOT NULL,
  child_id   uuid NOT NULL,
  family_id  uuid NOT NULL,
  PRIMARY KEY (event_id, child_id),
  FOREIGN KEY (event_id, family_id) REFERENCES event (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE
);

-- Per-subject rule on the event's day: skip | lighter | normal.
CREATE TABLE event_subject_rule (
  event_id    uuid NOT NULL,
  subject_id  uuid NOT NULL,
  family_id   uuid NOT NULL,
  rule        text NOT NULL CHECK (rule IN ('skip', 'lighter', 'normal')),
  PRIMARY KEY (event_id, subject_id),
  FOREIGN KEY (event_id, family_id) REFERENCES event (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, family_id) REFERENCES subject (id, family_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------- vacations / holidays / sick days
CREATE TABLE blocked_range (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  label       text,
  kind        text NOT NULL DEFAULT 'vacation' CHECK (kind IN ('vacation', 'holiday', 'sick', 'other')),
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  UNIQUE (id, family_id)
);
CREATE INDEX blocked_range_family_dates_idx ON blocked_range (family_id, start_date, end_date);

-- Children a block applies to. No rows = the whole family.
CREATE TABLE blocked_range_child (
  blocked_range_id  uuid NOT NULL,
  child_id          uuid NOT NULL,
  family_id         uuid NOT NULL,
  PRIMARY KEY (blocked_range_id, child_id),
  FOREIGN KEY (blocked_range_id, family_id) REFERENCES blocked_range (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------- week overrides
-- "This week, do N units instead." Needed by the engine (keepEndDate / pushEndDate).
-- Not in the original table list; added so overrides survive a reload. child_id NULL = every child.
CREATE TABLE week_override (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      uuid NOT NULL,
  assignment_id  uuid NOT NULL,
  child_id       uuid,
  week_start     date NOT NULL,
  planned_units  numeric(10,2) NOT NULL CHECK (planned_units >= 0),
  mode           text NOT NULL CHECK (mode IN ('keepEndDate', 'pushEndDate')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE
);
-- One override per assignment, child (or all children), week. NULLS NOT DISTINCT needs PG15, so use COALESCE.
CREATE UNIQUE INDEX week_override_uq
  ON week_override (assignment_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start);

-- ---------------------------------------------------------------- logging
-- One row per thing a parent records. id is the client-generated UUID.
--  kind = 'checkoff': "did today's planned work" (at most one per assignment/child/date, see index below)
--  kind = 'session' : a free-form session ("read 12 pages, 25 min"); any number per day.
CREATE TABLE log_entry (
  id             uuid PRIMARY KEY,                -- client UUID, no default on purpose
  family_id      uuid NOT NULL,
  assignment_id  uuid NOT NULL,
  log_date       date NOT NULL,                   -- the local day the work was done
  kind           text NOT NULL CHECK (kind IN ('checkoff', 'session')),
  minutes_spent  integer CHECK (minutes_spent >= 0),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE,
  -- target for log_child_progress's composite FK (keeps its copied columns in sync)
  UNIQUE (id, assignment_id, log_date, kind)
);
CREATE INDEX log_entry_assignment_date_idx ON log_entry (assignment_id, log_date);

-- Units each child did in a log entry. assignment_id / log_date / kind are copied from log_entry
-- (kept in sync by the composite FK with ON UPDATE CASCADE) so the partial unique index can live here.
CREATE TABLE log_child_progress (
  log_entry_id   uuid NOT NULL,
  child_id       uuid NOT NULL,
  assignment_id  uuid NOT NULL,
  log_date       date NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('checkoff', 'session')),
  units          numeric(10,2) NOT NULL CHECK (units >= 0),
  PRIMARY KEY (log_entry_id, child_id),
  FOREIGN KEY (log_entry_id, assignment_id, log_date, kind)
    REFERENCES log_entry (id, assignment_id, log_date, kind) ON DELETE CASCADE ON UPDATE CASCADE,
  -- the child must actually be on the assignment
  FOREIGN KEY (assignment_id, child_id) REFERENCES assignment_child (assignment_id, child_id) ON DELETE CASCADE
);
-- At most one check-off per assignment, date and child. Sessions are unlimited.
CREATE UNIQUE INDEX log_child_progress_one_checkoff_uq
  ON log_child_progress (assignment_id, log_date, child_id)
  WHERE kind = 'checkoff';
CREATE INDEX log_child_progress_child_idx ON log_child_progress (child_id, assignment_id);

INSERT INTO schema_migration (version) VALUES ('001_init');

COMMIT;
