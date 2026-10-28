# S1-07 — Add a Postgres connection pool to the API

**Depends on:** S1-04, S1-06  
**Size:** S

## Goal
The API has one shared `pg` Pool, created from config, closed on shutdown, and checked by `GET /api/health`.

## Context
Use plain SQL through `pg` (node-postgres), with no ORM. DeeDee knows SQL well, and the schema already exists as hand-written SQL. Put queries in small repository modules (one file per table) so they're easy to find.

## Steps
1. `npm i -w @hh/api pg` and `npm i -D -w @hh/api @types/pg`.
2. Create `apps/api/src/db.ts`: `createPool(config)` returns a `pg.Pool` (max 10). Export a tiny helper `query<T>(sql, params)` that returns `rows as T[]`.
3. IMPORTANT, dates: by default `pg` turns DATE columns into JS `Date` objects at local midnight, which breaks local-date logic. Call `types.setTypeParser(1082, (v) => v)` once so DATE comes back as the string `YYYY-MM-DD`. Do the same for NUMERIC (1700) → `Number(v)`.
4. Decorate Fastify with the pool (`app.decorate('db', pool)`), close it in an `onClose` hook.
5. Extend `/api/health` to run `select 1` and return `{ ok, engineVersion, db: 'ok' | 'down' }` (still 200 if the DB is down, so the web app can show a banner).

## Done when
- [x] With the Compose DB running, health shows `db: 'ok'`. With it stopped, `db: 'down'`.
- [x] A DATE column read through the pool comes back as a string.

## Tests
- Integration test (skipped when `DATABASE_URL` is unset): `select '2026-11-01'::date as d` returns the string `'2026-11-01'`
- Integration test: numeric comes back as number

## Out of scope
- Repositories for specific tables (later tickets).
