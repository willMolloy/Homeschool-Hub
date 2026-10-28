# S1-10 — Add password hashing helpers

**Depends on:** S1-05  
**Size:** XS

## Goal
`hashPassword` and `verifyPassword` in the API use Node's built-in scrypt with a random salt and constant-time compare.

## Context
No native dependencies (bcrypt and argon2 need compilers on some machines). Node's `crypto.scrypt` is safe when parameters are stored alongside the hash.

## Steps
1. Create `apps/api/src/auth/password.ts`.
2. `hashPassword(pw)`: 16-byte random salt, `scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 })`, return `scrypt$16384$8$1$<saltB64>$<hashB64>`.
3. `verifyPassword(pw, stored)`: parse the parameters, recompute, compare with `crypto.timingSafeEqual`. Return false (don't throw) on a malformed string.
4. Add a CLI `apps/api/src/cli/set-family-login.ts <familyId> <email>` that prompts for the password (no echo) and updates `family.login_email/password_hash`. This is how the family login gets created. There's no signup screen in Sprint 1.

## Done when
- [x] Unit tests pass.
- [x] CLI sets the login on a family (TTY, no-echo prompt checked by hand; piped-stdin path covered by an integration test). Re-checked on the seeded family in S1-11.

## Tests
- hash then verify same password → true
- wrong password → false
- two hashes of the same password differ (salt)
- malformed stored string → false
- verification takes > 10 ms (sanity that scrypt actually runs)

## Out of scope
- Signup UI.
- Password reset.
