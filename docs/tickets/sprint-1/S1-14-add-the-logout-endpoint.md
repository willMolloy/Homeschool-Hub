# S1-14 — Add the logout endpoint

**Depends on:** S1-13  
**Size:** XS

## Goal
`POST /api/auth/logout` deletes the current session row and clears the cookie.

## Context
Logout must work even if the session is already gone, so the client can always reach a clean state.

## Steps
1. Route `POST /api/auth/logout` (public. If there's a cookie, hash it and delete that session).
2. Clear the cookie (`reply.clearCookie('hh_session', { path: '/' })`).
3. Always respond 204.

## Done when
- [ ] After logout, the old cookie gets 401 on protected routes.

## Tests
- logout with a valid session → 204, row deleted, old cookie now 401
- logout without a cookie → 204

## Out of scope
- Logging out every device (later).
