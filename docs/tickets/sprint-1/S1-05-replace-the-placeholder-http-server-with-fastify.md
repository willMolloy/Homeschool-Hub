# S1-05 — Replace the placeholder HTTP server with Fastify

**Depends on:** S1-01  
**Size:** S

## Goal
The API runs on Fastify with the same `GET /api/health` behavior and its tests still pass.

## Context
`apps/api/src/app.ts` is a bare `node:http` placeholder. Fastify gives routing, JSON schemas, cookies, and `app.inject()` for fast tests without opening a port. It feels closest to what a Java dev expects from a framework without being heavy.

## Steps
1. `npm i -w @hh/api fastify`.
2. Rewrite `apps/api/src/app.ts` to export `buildApp(): FastifyInstance` that registers `GET /api/health` → `{ ok: true, engineVersion: ENGINE_VERSION }`.
3. Unknown routes return 404 `{ error: "not_found" }`: use `app.setNotFoundHandler`.
4. Add a shared error handler (`app.setErrorHandler`) that returns `{ error: <code>, message }` with the right status; validation errors → 400 `{ error: "invalid_request", details }`.
5. Update `src/server.ts` to `await buildApp().listen({ port, host: "0.0.0.0" })`.
6. Rewrite `test/health.test.ts` to use `app.inject()` instead of a real port.

## Done when
- [ ] `npm run dev:api` serves `/api/health` as before.
- [ ] `npm test -w @hh/api` passes.
- [ ] Remove the old 'Ticket S1-05' comment from app.ts.

## Tests
- health returns 200 + engineVersion
- unknown route returns 404 JSON
- a route that throws returns 500 JSON (add a test-only route inside the test)

## Out of scope
- Database access (S1-07).
- Auth (S1-10+).
