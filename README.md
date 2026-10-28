# Homeschool Hub

A year-long timeline planner for homeschool families, with low-friction logging. TypeScript everywhere.

```
packages/engine   @hh/engine: the pure, versioned scheduling engine (no I/O, no Date objects). ENGINE_VERSION in src/version.ts
apps/api          @hh/api: Fastify API (auth, roster, schedule data, /api/plan)
apps/web          @hh/web: Vite + React PWA (Plan debug view, Kids, Subjects, Schedule)
db/               SQL migrations, runner, seed, demo script, schema validation (db/README.md)
docs/tickets/     Sprint 1 and Sprint 2a tickets, order and dependencies
docs/REVIEW-GUIDE.md  how to run it and what to look at (start here if you're reviewing)
docs/pilot/       DRAFT pilot recruiting and facilitation materials (not posted)
```

## Commands (Node ≥ 20)

```
npm install
npm run demo        # reset + seed hh_dev, start API and web if needed, print the login and URLs (dev only)
npm test            # engine, api, web, db (integration tests need DATABASE_URL=…/hh_test, else skipped)
npm run test:tz     # engine tests under 7 time zones (engine must not depend on TZ)
npm run lint
npm run typecheck
npm run build
npm run dev:web     # Vite dev server on :5173 (proxies /api to :3000)
npm run dev:api     # API on :3000
```

## Local database

Postgres 16 runs in Docker:

```
docker compose up -d db            # start (data persists in the hh-pgdata volume)
docker compose ps                  # wait for "healthy"
cp .env.example .env               # DATABASE_URL=…/hh_dev; set SESSION_SECRET (openssl rand -hex 32)
docker compose exec db createdb -U hh hh_test   # once, for the integration tests
psql postgres://hh:hh@localhost:5432/hh_dev -c 'select 1'
docker compose down                # stop (add -v to delete the data)
```

Validate the schema: see `db/README.md` (`DATABASE_URL=... node db/test/validate.cjs`).

Reviewing? Start with `docs/REVIEW-GUIDE.md`.
