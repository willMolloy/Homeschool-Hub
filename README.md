# Homeschool Hub

A year-long timeline planner for homeschool families, with low-friction logging. TypeScript everywhere.

```
packages/engine   @hh/engine: the pure, versioned scheduling engine (no I/O, no Date objects). ENGINE_VERSION in src/version.ts
apps/api          @hh/api: Node API (placeholder http server; Fastify in ticket S1-05)
apps/web          @hh/web: Vite + React PWA (shell only)
db/               001_init.sql schema + validation (db/README.md)
docs/tickets/     Sprint 1 tickets, order and dependencies, Sprint 2–3 outline (pending pilot results)
docs/pilot/       DRAFT pilot recruiting and facilitation materials (not posted)
```

## Commands (Node ≥ 20)

```
npm install
npm test            # engine (128 tests) + api (2 tests)
npm run test:tz     # engine tests under 7 time zones (engine must not depend on TZ)
npm run typecheck
npm run build
npm run dev:web     # Vite dev server
npm run dev:api     # API on :3000
```

Validate the schema: see `db/README.md` (`DATABASE_URL=... node db/test/validate.cjs`).

Start with `docs/tickets/README.md` → S1-01.
