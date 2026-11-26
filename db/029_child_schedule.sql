-- 029_child_schedule (S22-01): each child on a book keeps their own planned end and their own finished or stopped day.
-- Copied from the assignment, so a shared book looks the same until a parent changes one child (S22-03).
-- A new child row with no end of its own receives the book's end and ending. The end is not before the book's start.
BEGIN;

ALTER TABLE assignment_child
  ADD COLUMN end_date date,
  ADD COLUMN ended_as text CHECK (ended_as IN ('finished', 'stopped')),
  ADD COLUMN ended_on date,
  ADD CONSTRAINT assignment_child_ended_pair CHECK ((ended_as IS NULL) = (ended_on IS NULL));

UPDATE assignment_child ac
   SET end_date = a.end_date,
       ended_as = a.ended_as,
       ended_on = a.ended_on
  FROM assignment a
 WHERE a.id = ac.assignment_id
   AND a.family_id = ac.family_id;

ALTER TABLE assignment_child ALTER COLUMN end_date SET NOT NULL;

CREATE FUNCTION assignment_child_schedule() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  a_start date;
  a_end date;
  a_as text;
  a_on date;
BEGIN
  SELECT start_date, end_date, ended_as, ended_on
    INTO a_start, a_end, a_as, a_on
    FROM assignment WHERE id = NEW.assignment_id;
  IF NEW.end_date IS NULL THEN
    NEW.end_date := a_end;
    IF NEW.ended_as IS NULL AND NEW.ended_on IS NULL THEN
      NEW.ended_as := a_as;
      NEW.ended_on := a_on;
    END IF;
  END IF;
  IF NEW.end_date IS NULL OR a_start IS NULL OR NEW.end_date < a_start THEN
    RAISE EXCEPTION 'assignment_child end is before the start' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assignment_child_schedule_biu
  BEFORE INSERT OR UPDATE ON assignment_child
  FOR EACH ROW EXECUTE PROCEDURE assignment_child_schedule();

INSERT INTO schema_migration (version) VALUES ('029_child_schedule');
COMMIT;
