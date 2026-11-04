-- 019_setup_flow (S11-01): where a family is in the first-run setup flow.
-- setup_step is the step it is on (1..6), setup_done is true once it finished the flow (or never needed it), and
-- setup_deferred lists the steps it put off with "I'll set this later" / "I'll get back to you on this" ('year', 'breaks').
-- Families that exist when this runs are marked done, so they never see the flow; a family created afterwards starts at step 1.
BEGIN;

ALTER TABLE family ADD COLUMN setup_step smallint NOT NULL DEFAULT 1;
ALTER TABLE family ADD COLUMN setup_done boolean NOT NULL DEFAULT false;
ALTER TABLE family ADD COLUMN setup_deferred text[] NOT NULL DEFAULT '{}';
ALTER TABLE family ADD CONSTRAINT family_setup_step_range CHECK (setup_step BETWEEN 1 AND 6);
ALTER TABLE family ADD CONSTRAINT family_setup_deferred_values CHECK (setup_deferred <@ ARRAY['year', 'breaks']::text[]);

UPDATE family SET setup_done = true;

INSERT INTO schema_migration (version) VALUES ('019_setup_flow');
COMMIT;
