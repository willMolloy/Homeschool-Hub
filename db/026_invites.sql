-- 026_invites (S14-02): invite links. Only the SHA-256 of the random token is stored (like sessions), so a database dump holds no
-- usable link. An invite is single use (used_at), can be cancelled (revoked_at) and expires (7 days, set by the API).
-- family_id NULL: it makes a new family and its first parent (made with the command). family_id set: it adds a parent to that
-- family (S14-03). The family's invites go with the family.
BEGIN;

CREATE TABLE invite (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  family_id  uuid REFERENCES family(id) ON DELETE CASCADE,
  created_by uuid REFERENCES parent(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX invite_family_idx ON invite (family_id) WHERE family_id IS NOT NULL;

INSERT INTO schema_migration (version) VALUES ('026_invites');
COMMIT;
