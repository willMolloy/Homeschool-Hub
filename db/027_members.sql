-- 027_members (S15-01): one login can belong to more than one account. A `parent` row is now a person with a login (the name is kept
-- from Sprint 14); `family_member` says which accounts that person belongs to and in what role: 'parent' (their own family, full rights)
-- or 'viewer' (view-only: a co-op's account, or a family a parent shared). A viewer-only person has no home family, so parent.family_id
-- becomes nullable. Every existing parent becomes a 'parent' member of their family (backfill here, and a trigger does the same for any
-- later parent row, so older code and fixtures that insert a parent with a family keep working).
-- A session names the person AND the account it is looking at; the pair must be a membership, so a session can never be pointed at an
-- account its person does not belong to, and removing a member removes their sessions for that account (they are refused at the next request).
-- Invites gain a role (a view-only sign-up link is an invite with role 'viewer') and an optional label such as "Co-op".
BEGIN;

ALTER TABLE parent ALTER COLUMN family_id DROP NOT NULL;

CREATE TABLE family_member (
  family_id    uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  parent_id    uuid NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('parent', 'viewer')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  PRIMARY KEY (family_id, parent_id)
);
CREATE INDEX family_member_parent_idx ON family_member (parent_id);

INSERT INTO family_member (family_id, parent_id, role, created_at)
SELECT family_id, id, 'parent', created_at FROM parent WHERE family_id IS NOT NULL;

CREATE FUNCTION parent_home_member() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.family_id IS NOT NULL THEN
    INSERT INTO family_member (family_id, parent_id, role) VALUES (NEW.family_id, NEW.id, 'parent') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER parent_home_member_trg AFTER INSERT ON parent FOR EACH ROW EXECUTE FUNCTION parent_home_member();

ALTER TABLE session DROP CONSTRAINT session_parent_fk;
ALTER TABLE session ADD CONSTRAINT session_member_fk FOREIGN KEY (family_id, parent_id) REFERENCES family_member (family_id, parent_id) ON DELETE CASCADE;

ALTER TABLE invite ADD COLUMN role text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'viewer'));
ALTER TABLE invite ADD COLUMN label text CHECK (label IS NULL OR length(btrim(label)) BETWEEN 1 AND 60);
-- A viewer link always belongs to a family; the command's new-family link is a parent link with no family.
ALTER TABLE invite ADD CONSTRAINT invite_viewer_has_family CHECK (role = 'parent' OR family_id IS NOT NULL);

INSERT INTO schema_migration (version) VALUES ('027_members');
COMMIT;
