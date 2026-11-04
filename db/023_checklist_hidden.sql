-- 023_checklist_hidden (S11b-02): the family hid Home's getting-started reminders. Stored on the family (it was this browser's, for
-- every family that signed in on it), so one family hiding them never hides another's. The same jobs stay reachable from Set up.
BEGIN;

ALTER TABLE family ADD COLUMN checklist_hidden boolean NOT NULL DEFAULT false;

INSERT INTO schema_migration (version) VALUES ('023_checklist_hidden');
COMMIT;
