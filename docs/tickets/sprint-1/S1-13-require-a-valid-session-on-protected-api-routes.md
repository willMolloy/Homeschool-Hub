# S1-13 — Require a valid session on protected API routes

**Depends on:** S1-12  
**Size:** S

## Goal
Every `/api/*` route except health and login returns 401 unless the request carries a live session cookie, and handlers can read `request.familyId`.

## Context
Every family-owned query must filter by family_id, and the family id must come from the session, never from the request body or URL. That's the whole authorization model for Sprint 1.

## Steps
1. Create a Fastify `preHandler` hook (plugin `auth/session.ts`).
2. Skip for `GET /api/health` and `POST /api/auth/login`.
3. Read the `hh_session` cookie → sha256 → `SELECT family_id FROM session WHERE id=$1 AND expires_at > now()`.
4. Missing or expired → 401 `{ error: 'unauthenticated' }`.
5. Found → set `request.familyId` (add a TypeScript declaration merge for `FastifyRequest`) and update `last_seen_at` at most once per hour (sliding expiry: also push `expires_at` to now()+30d).

## Done when
- [x] A protected test route returns 401 without the cookie and 200 with it.

## Tests
- no cookie → 401
- garbage cookie → 401
- expired session → 401
- valid session → handler sees the right familyId
- health stays public

## Out of scope
- Per-person roles.
