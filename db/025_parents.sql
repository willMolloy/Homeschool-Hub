-- 025_parents (S14-01): a family can have more than one parent login. Each family's existing login (family.login_email /
-- password_hash) becomes its first parent, so every sign-in keeps working; the old columns are then dropped (the migration test
-- checks the move before and after). Sessions point at the parent as well as the family: the pair (parent_id, family_id) must
-- match a parent row, so a session can never name a parent of another family. A session row with no parent (old test fixtures
-- only; sign-in always sets one) still works and has no name.
BEGIN;

CREATE TABLE parent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  email         text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  password_hash text NOT NULL,   -- scrypt$N$r$p$saltB64$hashB64 (apps/api/src/auth/password.ts)
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, family_id)
);
-- Emails are compared case-insensitively and are unique across all families.
CREATE UNIQUE INDEX parent_email_uq ON parent (lower(email));
CREATE INDEX parent_family_idx ON parent (family_id);

-- The first parent of each family with a login: named after the family's login (the part before the @) until they change it.
INSERT INTO parent (family_id, name, email, password_hash, created_at)
SELECT id, COALESCE(NULLIF(left(btrim(split_part(login_email, '@', 1)), 100), ''), 'Parent'), login_email, password_hash, created_at
  FROM family
 WHERE login_email IS NOT NULL AND password_hash IS NOT NULL;

ALTER TABLE session ADD COLUMN parent_id uuid;
ALTER TABLE session ADD CONSTRAINT session_parent_fk FOREIGN KEY (parent_id, family_id) REFERENCES parent (id, family_id) ON DELETE CASCADE;
UPDATE session s SET parent_id = p.id FROM (SELECT DISTINCT ON (family_id) id, family_id FROM parent ORDER BY family_id, created_at, id) p WHERE p.family_id = s.family_id;

DROP INDEX family_login_email_uq;
ALTER TABLE family DROP COLUMN login_email, DROP COLUMN password_hash;

INSERT INTO schema_migration (version) VALUES ('025_parents');
COMMIT;
