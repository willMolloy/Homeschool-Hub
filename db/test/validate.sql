-- Behavioural checks for db/0*.sql. Run after the migration on an EMPTY database.
-- Every check RAISEs on failure; the script prints 'ALL CHECKS PASSED' at the end.
SET client_min_messages = notice;

-- helper: assert that a statement fails with a given SQLSTATE
CREATE OR REPLACE FUNCTION pg_temp.expect_error(stmt text, state text, label text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> state THEN
      RAISE EXCEPTION 'FAIL %: expected SQLSTATE % but got % (%)', label, state, SQLSTATE, SQLERRM;
    END IF;
    RAISE NOTICE 'ok   %', label;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL %: statement succeeded but should have failed', label;
END $$ LANGUAGE plpgsql;

-- fixtures
INSERT INTO family (id, name, week_start) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Example family', 'mon'),
  ('f0000000-0000-0000-0000-000000000002', 'Other family', 'sun');
INSERT INTO child (id, family_id, name) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Frank'),
  ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Margaret'),
  ('c0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000002', 'Other kid');
INSERT INTO subject (id, family_id, name) VALUES
  ('50000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Literature'),
  ('50000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'History'),
  ('50000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000002', 'Other subject');
INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Treasure Island', 'pages', 270, '2026-10-19', '2026-11-06'),
  ('a0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'History spine', 'lessons', 140, '2026-09-08', '2027-05-14');
INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001');
INSERT INTO event (id, family_id, name, weekdays, capacity_fraction) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Co-op', '{2}', 0.5);
INSERT INTO event_subject_rule (event_id, subject_id, family_id, rule) VALUES
  ('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'skip');
INSERT INTO blocked_range (id, family_id, label, start_date, end_date) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Christmas', '2026-12-21', '2027-01-01');
INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-10-26', 60, 'pushEndDate');

-- 1. checkoff: one per (assignment, date, child)
INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES
  ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'checkoff');
INSERT INTO log_child_progress (log_entry_id, child_id, assignment_id, log_date, kind, units) VALUES
  ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'checkoff', 1),
  ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'checkoff', 1);
INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES
  ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'checkoff');
SELECT pg_temp.expect_error($$INSERT INTO log_child_progress VALUES ('10000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-10-20','checkoff',1)$$,
  '23505', 'second checkoff for same assignment/date/child is rejected');
-- ...but the other child on another entry the next day is fine, and a different date is fine
INSERT INTO log_child_progress VALUES ('10000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-10-20','checkoff',0)
  ON CONFLICT DO NOTHING;  -- idempotent client retry pattern on the partial index
DO $$ BEGIN
  IF (SELECT count(*) FROM log_child_progress WHERE kind='checkoff' AND child_id='c0000000-0000-0000-0000-000000000001' AND log_date='2026-10-20') <> 1 THEN
    RAISE EXCEPTION 'FAIL ON CONFLICT DO NOTHING should keep exactly one checkoff'; END IF;
  RAISE NOTICE 'ok   ON CONFLICT DO NOTHING keeps exactly one checkoff';
END $$;

-- 2. sessions: unlimited per day, and they coexist with a checkoff
INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind, minutes_spent) VALUES
  ('20000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'session', 25),
  ('20000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'session', 15);
INSERT INTO log_child_progress VALUES
  ('20000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-10-20','session',0.5),
  ('20000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-10-20','session',0.5);
DO $$ BEGIN RAISE NOTICE 'ok   two sessions + a checkoff on the same day for the same child'; END $$;

-- 3. client UUID idempotency: replaying the same log_entry is a no-op
INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES
  ('20000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-20', 'session')
  ON CONFLICT (id) DO NOTHING;
SELECT pg_temp.expect_error($$INSERT INTO log_entry (family_id, assignment_id, log_date, kind) VALUES ('f0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','2026-10-21','session')$$,
  '23502', 'log_entry.id has no server default (client must send its UUID)');

-- 4. copied columns must match the parent log_entry
INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES
  ('20000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '2026-10-23', 'session');
SELECT pg_temp.expect_error($$INSERT INTO log_child_progress VALUES ('20000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','2026-10-23','checkoff',1)$$,
  '23503', 'progress row with a kind different from its log_entry is rejected');
SELECT pg_temp.expect_error($$INSERT INTO log_child_progress VALUES ('20000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','2026-10-21','session',1)$$,
  '23503', 'progress row with a date different from its log_entry is rejected');
-- changing the entry's date cascades to its progress rows
UPDATE log_entry SET log_date = '2026-10-22' WHERE id = '20000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF (SELECT log_date FROM log_child_progress WHERE log_entry_id='20000000-0000-0000-0000-000000000002') <> '2026-10-22' THEN
    RAISE EXCEPTION 'FAIL date change did not cascade'; END IF;
  RAISE NOTICE 'ok   moving a log_entry to another date cascades to its progress rows';
END $$;
-- changing a session into a checkoff that collides is rejected via the cascaded partial index
SELECT pg_temp.expect_error($$UPDATE log_entry SET kind='checkoff', log_date='2026-10-20' WHERE id='20000000-0000-0000-0000-000000000002'$$,
  '23505', 'turning a session into a duplicate checkoff is rejected');

-- 5. a child not on the assignment cannot log progress on it
INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES
  ('30000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '2026-10-20', 'session');
SELECT pg_temp.expect_error($$INSERT INTO log_child_progress VALUES ('30000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','2026-10-20','session',5)$$,
  '23503', 'progress for a child who is not on the assignment is rejected');

-- 6. cross-family references are impossible
SELECT pg_temp.expect_error($$INSERT INTO assignment_child VALUES ('a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000009','f0000000-0000-0000-0000-000000000001')$$,
  '23503', 'another family''s child cannot be put on an assignment');
SELECT pg_temp.expect_error($$INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date) VALUES ('f0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000009','x','pages',1,'2026-01-01','2026-01-02')$$,
  '23503', 'another family''s subject cannot be used');

-- 7. value checks
SELECT pg_temp.expect_error($$INSERT INTO family (name, week_start) VALUES ('x','tue')$$, '23514', 'week_start must be mon|sun');
SELECT pg_temp.expect_error($$INSERT INTO family (name, school_days) VALUES ('x','{1,7}')$$, '23514', 'school_days must be 0..6');
SELECT pg_temp.expect_error($$INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date) VALUES ('f0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','x','pages',1,'2026-02-01','2026-01-31')$$,
  '23514', 'assignment end before start is rejected');
SELECT pg_temp.expect_error($$INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date) VALUES ('f0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','x','verses',1,'2026-01-01','2026-01-31')$$,
  '23514', 'unknown unit_type is rejected');
SELECT pg_temp.expect_error($$INSERT INTO event (family_id, name, weekdays, capacity_fraction) VALUES ('f0000000-0000-0000-0000-000000000001','x','{2}',1.5)$$,
  '23514', 'capacity_fraction must be 0..1');
SELECT pg_temp.expect_error($$INSERT INTO event (family_id, name, weekdays) VALUES ('f0000000-0000-0000-0000-000000000001','x','{}')$$,
  '23514', 'event needs at least one weekday');
SELECT pg_temp.expect_error($$INSERT INTO event_subject_rule VALUES ('e0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000001','half')$$,
  '23514', 'event rule must be skip|lighter|normal');
SELECT pg_temp.expect_error($$INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES (gen_random_uuid(),'f0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','2026-10-20','note')$$,
  '23514', 'log kind must be checkoff|session');
SELECT pg_temp.expect_error($$INSERT INTO subject (family_id, name) VALUES ('f0000000-0000-0000-0000-000000000001',' literature ')$$,
  '23505', 'subject names are unique per family, case-insensitively');
SELECT pg_temp.expect_error($$INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode) VALUES ('f0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',NULL,'2026-10-26',10,'keepEndDate')$$,
  '23505', 'one all-children override per assignment/week');
INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode) VALUES
  ('f0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','2026-10-26',10,'keepEndDate');
DO $$ BEGIN RAISE NOTICE 'ok   a per-child override can coexist with the all-children one'; END $$;

-- 8. deleting an assignment cascades its children/logs; deleting a family cascades everything
DELETE FROM assignment WHERE id = 'a0000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM log_entry WHERE assignment_id='a0000000-0000-0000-0000-000000000002')
     OR EXISTS (SELECT 1 FROM log_child_progress WHERE assignment_id='a0000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'FAIL assignment delete did not cascade to logs'; END IF;
  RAISE NOTICE 'ok   deleting an assignment removes its logs';
END $$;
DELETE FROM family WHERE id = 'f0000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM child WHERE family_id='f0000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'FAIL family delete did not cascade'; END IF;
  RAISE NOTICE 'ok   deleting a family removes all its rows';
END $$;

-- 9. auth (002_auth): login emails unique case-insensitively; sessions die with their family
INSERT INTO family (id, name, week_start, login_email, password_hash) VALUES
  ('f0000000-0000-0000-0000-0000000000a1', 'Auth family', 'mon', 'Parent@Example.com', 'x');
SELECT pg_temp.expect_error($$INSERT INTO family (name, week_start, login_email) VALUES ('Dup', 'mon', 'parent@example.COM')$$,
  '23505', 'login_email is unique case-insensitively');
INSERT INTO family (name, week_start) VALUES ('No login 1', 'mon'), ('No login 2', 'mon');
DO $$ BEGIN RAISE NOTICE 'ok   several families may have no login yet'; END $$;
INSERT INTO session (id, family_id, expires_at) VALUES
  (encode(sha256('token-1'), 'hex'), 'f0000000-0000-0000-0000-0000000000a1', now() + interval '30 days');
SELECT pg_temp.expect_error($$INSERT INTO session (id, family_id, expires_at) VALUES ('s', 'f0000000-0000-0000-0000-0000000000ff', now())$$,
  '23503', 'a session must belong to an existing family');
DELETE FROM family WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM session) THEN RAISE EXCEPTION 'FAIL family delete did not remove its sessions'; END IF;
  RAISE NOTICE 'ok   deleting a family removes its sessions';
END $$;

-- 10. (removed in S2b-15: RF-10's minutes_per_unit checks; 007 dropped the column. db/test/drop-mpu.test.ts covers it.)

-- 11. weight_per_unit is 0.01..100 or NULL, on every unit type (004_weight_per_unit)
INSERT INTO family (id, name, week_start) VALUES ('f0000000-0000-0000-0000-0000000000e0', 'Weight family', 'mon');
INSERT INTO subject (id, family_id, name) VALUES ('50000000-0000-0000-0000-0000000000e0', 'f0000000-0000-0000-0000-0000000000e0', 'Reading');
INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date) VALUES
  ('a0000000-0000-0000-0000-0000000000e1', 'f0000000-0000-0000-0000-0000000000e0', '50000000-0000-0000-0000-0000000000e0', 'Book', 'pages', 100, '2026-11-02', '2026-11-27'),
  ('a0000000-0000-0000-0000-0000000000e2', 'f0000000-0000-0000-0000-0000000000e0', '50000000-0000-0000-0000-0000000000e0', 'Practice', 'minutes', 600, '2026-11-02', '2026-11-27');
SELECT pg_temp.expect_error($$UPDATE assignment SET weight_per_unit = 0 WHERE id = 'a0000000-0000-0000-0000-0000000000e1'$$,
  '23514', 'weight_per_unit 0 is rejected');
SELECT pg_temp.expect_error($$UPDATE assignment SET weight_per_unit = 100.01 WHERE id = 'a0000000-0000-0000-0000-0000000000e1'$$,
  '23514', 'weight_per_unit 100.01 is rejected');
UPDATE assignment SET weight_per_unit = 0.01 WHERE id = 'a0000000-0000-0000-0000-0000000000e1';
UPDATE assignment SET weight_per_unit = 100 WHERE id = 'a0000000-0000-0000-0000-0000000000e1';
UPDATE assignment SET weight_per_unit = NULL WHERE id = 'a0000000-0000-0000-0000-0000000000e1';
UPDATE assignment SET weight_per_unit = 0.5 WHERE id = 'a0000000-0000-0000-0000-0000000000e2';
DO $$ BEGIN RAISE NOTICE 'ok   weight_per_unit 0.01, 100 and NULL are fine, and a minutes row may hold 0.5'; END $$;

-- 12. weight_choice: pages/chapters only, weight 0.01..100 or NULL, same-family child (005_weight_choice)
INSERT INTO child (id, family_id, name) VALUES ('c0000000-0000-0000-0000-0000000000e1', 'f0000000-0000-0000-0000-0000000000e0', 'Weighted kid');
INSERT INTO family (id, name, week_start) VALUES ('f0000000-0000-0000-0000-0000000000e9', 'Other weight family', 'mon');
INSERT INTO child (id, family_id, name) VALUES ('c0000000-0000-0000-0000-0000000000e9', 'f0000000-0000-0000-0000-0000000000e9', 'Other kid');
INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', 'pages', 1.4),
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', 'chapters', NULL);
SELECT pg_temp.expect_error($$INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', 'pages', 100.01)$$,
  '23514', 'weight_choice weight above 100 is rejected');
SELECT pg_temp.expect_error($$INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', 'pages', 0)$$,
  '23514', 'weight_choice weight 0 is rejected');
SELECT pg_temp.expect_error($$INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', 'lessons', 1)$$,
  '23514', 'weight_choice for lessons is rejected');
SELECT pg_temp.expect_error($$INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-0000000000e1', 'minutes', 1)$$,
  '23514', 'weight_choice for minutes is rejected');
SELECT pg_temp.expect_error($$INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'c0000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e1', 'pages', 1)$$,
  '23503', 'weight_choice for another family''s child is rejected');

-- 13. subject default weight: unit and weight together, weight 0.01..100 (006_subject_default_weight)
INSERT INTO subject (id, family_id, name, default_weight_unit, default_weight) VALUES
  ('50000000-0000-0000-0000-0000000000e3', 'f0000000-0000-0000-0000-0000000000e0', 'Default-weight math', 'lessons', 20),
  ('50000000-0000-0000-0000-0000000000e4', 'f0000000-0000-0000-0000-0000000000e0', 'No default', NULL, NULL);
SELECT pg_temp.expect_error($$UPDATE subject SET default_weight = 3 WHERE id = '50000000-0000-0000-0000-0000000000e4'$$,
  '23514', 'subject default weight without a unit is rejected');
SELECT pg_temp.expect_error($$UPDATE subject SET default_weight_unit = 'pages' WHERE id = '50000000-0000-0000-0000-0000000000e4'$$,
  '23514', 'subject default unit without a weight is rejected');
SELECT pg_temp.expect_error($$UPDATE subject SET default_weight = 0 WHERE id = '50000000-0000-0000-0000-0000000000e3'$$,
  '23514', 'subject default weight 0 is rejected');
SELECT pg_temp.expect_error($$UPDATE subject SET default_weight = 100.01 WHERE id = '50000000-0000-0000-0000-0000000000e3'$$,
  '23514', 'subject default weight above 100 is rejected');
SELECT pg_temp.expect_error($$UPDATE subject SET default_weight_unit = 'hours' WHERE id = '50000000-0000-0000-0000-0000000000e3'$$,
  '23514', 'subject default unit outside the unit types is rejected');

-- 14. progress check-ins and week reviews (008_progress_checkin)
INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'a0000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1', '2026-09-07', 65, 'keepEndDate'),
  ('f0000000-0000-0000-0000-0000000000e0', 'a0000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1', '2026-09-14', 80, NULL);
SELECT pg_temp.expect_error($$INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'a0000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1', '2026-09-21', -1)$$,
  '23514', 'a negative check-in position is rejected');
SELECT pg_temp.expect_error($$INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'a0000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1', '2026-09-07', 70)$$,
  '23505', 'a second check-in for the same assignment, child and week is rejected');
SELECT pg_temp.expect_error($$INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'a0000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e9', '2026-09-21', 1)$$,
  '23503', 'a check-in for another family''s child is rejected');
SELECT pg_temp.expect_error($$INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode) VALUES
  ('f0000000-0000-0000-0000-0000000000e0', 'a0000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1', '2026-09-21', 1, 'later')$$,
  '23514', 'a check-in mode outside keepEndDate/pushEndDate is rejected');
INSERT INTO week_review (family_id, week_start, status) VALUES ('f0000000-0000-0000-0000-0000000000e0', '2026-09-07', 'reviewed');
SELECT pg_temp.expect_error($$INSERT INTO week_review (family_id, week_start, status) VALUES ('f0000000-0000-0000-0000-0000000000e0', '2026-09-07', 'skipped')$$,
  '23505', 'a second review of the same week is rejected');
SELECT pg_temp.expect_error($$INSERT INTO week_review (family_id, week_start, status) VALUES ('f0000000-0000-0000-0000-0000000000e0', '2026-09-14', 'maybe')$$,
  '23514', 'a week review status outside reviewed/skipped is rejected');

DO $$ BEGIN RAISE NOTICE 'ALL CHECKS PASSED'; END $$;
