# RF-03 — Move HttpError out of app.ts

**Depends on:** none  
**Size:** XS  
**Review refs:** developer M8, tester L-1

## Goal
`HttpError` lives in `apps/api/src/http/errors.ts`, so routes, validation and repos no longer import from `app.ts` (which imports them back).

## Context
There is a circular import: `app.ts` registers the routes, and the routes import `HttpError` from `app.ts`.

## Steps
1. Create `http/errors.ts` with `HttpError` (same constructor and fields).
2. Update every import. `app.ts` imports it from there too.

## Done when
- [x] `rg 'from "\.\./app"' apps/api/src` finds nothing.
- [x] The gate is green, with no test changes beyond imports.

## Tests
- The existing suite (behavior is identical).

## Out of scope
- Moving the HTTP error out of repos/refs (developer M8, second half).
