-- 017_record_entries (S9-07): what a parent typed into the log in Records, one row per child per entry.
-- Not the old log_entry table (001, assignment check-offs, unused by the app) and never the plan's check-ins: nothing here
-- is read by the plan, and nothing in the plan fills a row in (Will, 2026-11-01).
--   start_date .. end_date  the day, or the run of days, logged (one row per child when an entry names several children)
--   counts_school_day       the visible switch on the entry (on by default in the app)
--   school_days             how many days the entry counts, worked out when it is saved (0 when the switch is off)
--   subject_minutes         { subjectId: minutes } typed by the parent; total/home/away minutes are typed too
--   notes, books            typed text; books is a JSON list of titles
-- Hours are stored as whole minutes; the form takes hours and minutes.
BEGIN;

CREATE TABLE record_entry (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id          uuid NOT NULL REFERENCES family (id) ON DELETE CASCADE,
  child_id           uuid NOT NULL,
  start_date         date NOT NULL,
  end_date           date NOT NULL,
  counts_school_day  boolean NOT NULL,
  school_days        integer NOT NULL CHECK (school_days >= 0),
  subject_minutes    jsonb NOT NULL DEFAULT '{}'::jsonb CONSTRAINT record_entry_subject_minutes_object CHECK (jsonb_typeof(subject_minutes) = 'object'),
  total_minutes      integer CHECK (total_minutes IS NULL OR total_minutes >= 0),
  home_minutes       integer CHECK (home_minutes IS NULL OR home_minutes >= 0),
  away_minutes       integer CHECK (away_minutes IS NULL OR away_minutes >= 0),
  notes              text CHECK (notes IS NULL OR char_length(notes) BETWEEN 1 AND 2000),
  books              jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT record_entry_books_list CHECK (jsonb_typeof(books) = 'array'),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE
);
CREATE INDEX record_entry_family_date_idx ON record_entry (family_id, start_date);
CREATE INDEX record_entry_child_idx ON record_entry (child_id);

INSERT INTO schema_migration (version) VALUES ('017_record_entries');
COMMIT;
