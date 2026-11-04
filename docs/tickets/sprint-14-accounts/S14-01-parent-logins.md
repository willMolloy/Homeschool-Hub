# S14-01 — Parents get their own logins
**Size:** M
## Goal
A family can have more than one parent login; every existing login keeps working.
## Steps
1. Migration: a `parent` table (id, family_id, name, email unique, password_hash, created_at). Move each family's `login_email` / `password_hash` into a first parent row; sessions point at the parent (and through it the family). Keep the old columns only until the move is verified in the migration test, then drop them in the same migration or a follow-up.
2. Sign-in looks up the parent by email; `/api/me` returns the family and the signed-in parent's name.
3. Every family-scoped query stays scoped by the session's family (no change to what a parent can see; both parents have equal rights).
4. `set-family-login` becomes `set-parent-login` (reset a parent's password by email); keep the old name as an alias.
## Done when
- The demo family and test families sign in exactly as before; a family with two parents sees the same data from both logins.
## Tests
- DB: the migration moves logins, emails stay unique. API: sign-in, me, family scoping with two parents, the CLI.
