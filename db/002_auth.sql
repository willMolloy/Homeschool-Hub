-- 002_auth: one shared login per family + server-side sessions (Sprint 1).
BEGIN;

ALTER TABLE family
  ADD COLUMN login_email   text,
  ADD COLUMN password_hash text;   -- scrypt$N$r$p$saltB64$hashB64 (apps/api/src/auth/password.ts)

-- Emails are compared case-insensitively; NULLs (families without a login yet) are allowed.
CREATE UNIQUE INDEX family_login_email_uq ON family (lower(login_email));

-- session.id is the SHA-256 hex digest of the random cookie token, NEVER the raw token,
-- so a leaked database dump cannot be replayed as cookies.
CREATE TABLE session (
  id           text PRIMARY KEY,
  family_id    uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_family_idx ON session (family_id);

INSERT INTO schema_migration (version) VALUES ('002_auth');
COMMIT;
