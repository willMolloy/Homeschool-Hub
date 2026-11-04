-- 024_assignment_ended (S12-01): how an assignment ended, said by the parent. `ended_as` is 'finished' or 'stopped' (NULL while it is
-- open); `ended_on` is the day it ended. Both or neither. Existing rows stay open. Only the parent's answer sets it: nothing is
-- assumed from the end date, and it is a schedule fact, not a log entry.
BEGIN;

ALTER TABLE assignment
  ADD COLUMN ended_as text CHECK (ended_as IN ('finished', 'stopped')),
  ADD COLUMN ended_on date,
  ADD CONSTRAINT assignment_ended_pair CHECK ((ended_as IS NULL) = (ended_on IS NULL));

INSERT INTO schema_migration (version) VALUES ('024_assignment_ended');
COMMIT;
