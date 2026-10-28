# S2a-18 — Add a one-command demo

**Depends on:** Sprint 1 (migrations S1-09, seed S1-12)  
**Size:** XS

## Goal
`npm run demo` gives a clean, clickable demo in one command: it resets and seeds `hh_dev`, starts the API and web dev servers if they aren't already running, and prints the login and the URLs.

## Context
Reviewing the app currently takes four commands (`db:reset`, `db:seed`, `dev:api`, `dev:web`), and smoke runs leave archived test rows in `hh_dev`. DeeDee should be able to clone, start Postgres, run one command and click through.

## Steps
1. `db/demo.ts`:
   - `assertDemoDatabase(url, env)`: refuses unless the database name ends in `_dev` and `NODE_ENV` isn't `production`.
   - `prepareDemo(url)`: `reset()` then `seed()`, so no smoke leftovers remain.
   - `demoBanner({ webUrl, apiUrl, email, password })`: the text to print.
2. CLI (`npm run demo`):
   - Reads `DATABASE_URL` the same way as `db:migrate`, then prepares the database.
   - Checks `http://localhost:5173` and `http://localhost:<PORT>/api/health`, and starts whichever of `dev:api` / `dev:web` isn't running. Their output is prefixed `[api]` / `[web]`.
   - Waits until both answer, then prints the banner. Ctrl+C stops the servers it started.
   - `--no-serve` only resets, seeds and prints.
3. Document it in the README and in `docs/REVIEW-GUIDE.md`.

## Done when
- [x] `npm run demo` on the box leaves `hh_dev` holding only the demo family (no smoke leftovers) and prints the login and URLs.
- [x] It refuses `hh_test`, `hh` and `NODE_ENV=production`.

## Tests
- `assertDemoDatabase`: `hh_dev` OK; `hh_test`, `hh`, `hh_dev_copy` and production → throw
- `prepareDemo` (with the guard bypassed, on a scratch `_test` DB holding an extra family): afterwards only the demo family exists, with the seed's counts
- `demoBanner` contains the web URL, the API health URL and the login
- the CLI refuses a `_test` database (exit code ≠ 0, nothing reset)

## Out of scope
- Production or Docker images for the app itself.
- Opening a browser automatically.
