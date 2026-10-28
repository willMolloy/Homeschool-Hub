# RF-01 — Move the gate and smoke scripts into the repo

**Depends on:** none  
**Size:** XS  
**Review refs:** developer M10

## Goal
The full gate and the browser smoke runner live in the repo, so anyone can run exactly what the overnight runs used.

## Context
The gate (`/workspace/check.sh`) and the puppeteer smoke runner (`/tmp/shots/flow.mjs`, `manifest-check.mjs`, `scenarios/`) live outside the repo. The db validate step depends on an embedded Postgres under `/tmp/pg16`. If the box is wiped, the checks are gone.

## Steps
1. `scripts/check.sh`: lint, typecheck, build, `db:reset`, test, test:tz, `db:validate`. It stops on the first failure, prints the tail of the log, and finishes with the test counts plus `ALL GREEN`. `DATABASE_URL` defaults to the local `hh_test`.
2. `npm run db:validate`: `db/test/validate.cjs --scratch` creates an empty `hh_validate_test` database next to `DATABASE_URL`, applies the migrations, runs `validate.sql`, then drops it. It no longer needs embedded Postgres (that fallback stays for runs without `DATABASE_URL`).
3. `scripts/smoke/`: `flow.mjs`, `manifest-check.mjs`, `shot.mjs` and the scenarios, with their own `package.json` (puppeteer-core, axe-core). It is not an npm workspace, so the app's install doesn't pull a browser driver. Screens are written to `docs/progress/screens` relative to the repo, not via an absolute path. `CHROME_PATH` and `BASE_URL` can be overridden.
4. Document both in `scripts/README.md` and link it from the root README.

## Done when
- [ ] `scripts/check.sh` on the box is green with the same counts as `/workspace/check.sh`.
- [ ] `cd scripts/smoke && npm install && node flow.mjs login` works against the dev servers.

## Tests
- The gate itself: `scripts/check.sh` runs green.
- `npm run db:validate` prints `ALL CHECKS PASSED` and leaves no `hh_validate_test` database behind.

## Out of scope
- Running the smoke scenarios in CI (needs a browser in CI).
