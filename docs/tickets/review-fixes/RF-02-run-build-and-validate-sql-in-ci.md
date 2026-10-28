# RF-02 — Run build and validate.sql in CI

**Depends on:** RF-01  
**Size:** XS  
**Review refs:** developer M10

## Goal
CI runs the same gate as the box: it adds `npm run build` and `npm run db:validate` to the existing steps.

## Context
`.github/workflows/ci.yml` runs install, lint, typecheck, `db:reset`, test and test:tz. A broken Vite build or a schema check failure would pass CI.

## Steps
1. Add `npm run build` after typecheck.
2. Add `npm run db:validate` after test:tz. It uses the job's `DATABASE_URL` server to make and drop its scratch database.

## Done when
- [x] The workflow lists lint, typecheck, build, db:reset, test, test:tz, db:validate.
- [x] The YAML parses.

## Tests
- A YAML parse check on the box (nothing is pushed, so CI itself doesn't run here).

## Out of scope
- Caching the build, matrix builds.
