# S1-20 — Redirect signed-out users to the login screen

**Depends on:** S1-15, S1-18, S1-19  
**Size:** S

## Goal
Opening any shell page without a session sends you to `/login`, and you come back after signing in.

## Context
`GET /api/me` (S1-15) is the signed-in check. Also handle sessions that expire while the app is open (any 401 from the API wrapper).

## Steps
1. Create `src/auth/AuthProvider.tsx`: on mount call `apiGet('/api/me')`. Store `me | null | 'loading'` in context.
2. Protected layout route: while loading show a small spinner; if `null` → `<Navigate to='/login' state={{ from: location }} replace/>`.
3. Register `onUnauthenticated` (S1-18) to clear `me` and navigate to `/login`.
4. Add a 'Sign out' button in the shell header that calls `POST /api/auth/logout` then clears `me`.
5. Show the family name from `me` in the header.

## Done when
- [ ] Fresh browser → /kids redirects to /login, and after login lands on /kids.
- [ ] Sign out returns to /login.

## Tests
- Tests with mocked api: me=401 → redirected; me=200 → page renders; logout clears state

## Out of scope
- Remember-me options.
