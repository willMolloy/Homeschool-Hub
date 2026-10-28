# Overnight progress log, round 2 (Oct 28, 2026)

All times are America/Chicago (CT). The work was done on the build box only. Nothing was pushed, posted, or sent.

## Environment
- Node 20.19.2, Debian 13.
- **Postgres 16:** Docker isn't available on the build box, and the Debian apt repo has no PG16. I used `embedded-postgres@16.14.0-beta.17` instead, which gives real PostgreSQL **16.14** binaries.
  - `db/001_init.sql` plus `validate.sql` passed on **PostgreSQL 16.14** at 01:43 CT (and earlier on 18.4).
  - The dev/test DB for this round was PG 16.14 on localhost:5432 (user `hh`/`hh`, DBs `hh_dev` and `hh_test`), the same settings as the Compose file in S1-04.
- **Headless Chrome:** `/usr/bin/google-chrome` is used for the smoke screenshots.

## Tickets

| Ticket | Status | Commit | Notes |
|---|---|---|---|
| S1-01 | done | (this commit) | install, typecheck, test (128 + 2), test:tz (7 zones), `/api/health` → `{"ok":true,"engineVersion":"0.1.0"}`, and the web page renders `Engine v0.1.0` in headless Chrome. Finding: `npm run dev:web -- --port N` doesn't forward the flag through the two npm layers (use `npm run dev -w @hh/web -- --port N`). Fixed the ticket text to match the placeholder. |
| S1-02 | done (partly unverified) | | `.github/workflows/ci.yml` written. I simulated the CI steps in a fresh clone (`npm ci`, typecheck, tests) and they pass. **Not verified:** there's no GitHub remote yet, so the green PR check, the red/green test, and branch protection are still for DeeDee to do. |
| S1-03 | done | | `npm run lint` (ESLint 9 flat config, typescript-eslint, react-hooks) exits 0 with no disables needed; CI runs lint before typecheck. Ticket fixed first: `npm i -D -w .` isn't valid, so it now pins ESLint 9 and makes the root package ESM. |
| S1-04 | done (Docker part unverified) | | `docker-compose.yml` (postgres:16, hh/hh/hh_dev, healthcheck, `hh-pgdata` volume), `.env.example`, README "Local database". **Docker isn't available on the build box**, so I ran the same checks against an equivalent PG 16.14 on localhost:5432 with the same credentials: `select 1` works, and `validate.cjs` on a fresh scratch DB prints ALL CHECKS PASSED. `docker compose up` itself is still for DeeDee to check. |
