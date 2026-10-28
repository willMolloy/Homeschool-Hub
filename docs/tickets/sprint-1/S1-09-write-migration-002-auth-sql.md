# S1-09 — Write migration 002_auth.sql

**Depends on:** S1-08  
**Size:** XS

## Goal
The database can store one family login (email + password hash) and server-side sessions.

## Context
Sprint 1 has a single family login: one shared account per family, with no per-person users and no roles. Sessions are rows in a table referenced by an httpOnly cookie, which is easy to revoke and easy to reason about in SQL. No billing.

## Steps
1. Create `db/002_auth.sql` with BEGIN/COMMIT.
2. `ALTER TABLE family ADD COLUMN login_email text, ADD COLUMN password_hash text;` and a unique index on `lower(login_email)`.
3. Create `session (id text PRIMARY KEY, family_id uuid NOT NULL REFERENCES family(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now())` + index on `family_id`.
4. `session.id` stores a SHA-256 hex hash of the cookie token, never the raw token. Note this in a SQL comment.
5. `INSERT INTO schema_migration (version) VALUES ('002_auth');`
6. Add checks for the new constraints to `db/test/validate.sql` (duplicate email case-insensitive → 23505; deleting a family removes its sessions).

## Done when
- [ ] `npm run db:migrate` applies 002.
- [ ] `node db/test/validate.cjs` passes, including the new checks.

## Tests
- New validate.sql checks listed above

## Out of scope
- Password reset.
- Multiple logins per family.
- OAuth.
