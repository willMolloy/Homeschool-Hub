# S1-12 — Add the login endpoint

**Depends on:** S1-07, S1-09, S1-10  
**Size:** S

## Goal
`POST /api/auth/login` checks the family email and password and sets a session cookie.

## Context
Sessions live in the `session` table (S1-09). The cookie holds a random token; the DB stores only its SHA-256 hash.

## Steps
1. `npm i -w @hh/api @fastify/cookie`, register with `config.SESSION_SECRET`.
2. Body schema (zod or Fastify JSON schema): `{ email: string, password: string }`.
3. Look up the family by `lower(login_email)`. If not found, still run `verifyPassword` against a dummy hash so timing doesn't reveal which emails exist.
4. On success: token = 32 random bytes base64url; insert session with `id = sha256(token)`, `expires_at = now() + 30 days`; set cookie `hh_session=<token>` with `httpOnly`, `sameSite: 'lax'`, `secure` when production, `path: '/'`, `maxAge` 30 days.
5. Respond 200 `{ familyId, familyName }`. On failure respond 401 `{ error: 'invalid_credentials' }` (same message for unknown email and wrong password).
6. Basic brute-force limit: `@fastify/rate-limit` on this route only, 10/minute per IP.

## Done when
- [ ] Logging in with the seeded demo login sets the cookie and creates a session row.

## Tests
- correct credentials → 200 + Set-Cookie + session row exists with hashed id (not the raw token)
- wrong password → 401
- unknown email → 401 with the identical body
- email match is case-insensitive
- 11th attempt in a minute → 429

## Out of scope
- Logout (S1-14).
- Session check middleware (S1-13).
