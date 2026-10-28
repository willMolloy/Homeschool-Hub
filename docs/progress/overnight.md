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
| S1-05 | done | | Fastify 5 `buildApp()` with JSON 404, shared error handler (`HttpError` → `{error, message}`, validation → 400 `invalid_request`, others → 500 `internal_error` without leaking the message), tests via `app.inject()`. API tests: 3. |
| S1-06 | done | | zod 3 config (`PORT`, `DATABASE_URL`, `SESSION_SECRET` ≥ 32 chars, `NODE_ENV`); `loadConfig(env)` lists every bad key at once; the server exits 1 with a readable message. Deviation: instead of `import 'dotenv/config'`, `loadDotenv()` loads the **repo-root** `.env` explicitly, because npm runs the API with cwd = apps/api and dotenv/config would miss it. Only `server.ts` loads it, so tests never need a `.env`. API tests: 8. |
| S1-07 | done | | `src/db.ts`: a `pg` Pool (max 10, 3 s connect timeout, idle-error handler), `query<T>()`, and `withTransaction()`. Type parsers: DATE → string, NUMERIC → number. Health returns `db: ok/down` (always 200). Integration tests run when `DATABASE_URL` ends in `_test` (DATE string, NUMERIC number, health ok); "down" is tested against a dead port. Also in this commit: **zod 3 → 4.6.6**, because `npm audit` flags zod < 4.6.6 as high. API tests: 11. |
