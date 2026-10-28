# S1-08 — Write the migration runner

**Depends on:** S1-04  
**Size:** S

## Goal
`npm run db:migrate` applies every not-yet-applied `db/NNN_*.sql` file in order, each in its own transaction.

## Context
`db/001_init.sql` exists and inserts its own row into `schema_migration`. The runner needs to bootstrap that table on an empty DB. Keep migrations as plain SQL files: no ORM, no down-migrations. A mistake gets fixed with a new forward migration.

## Steps
1. Create `db/migrate.ts` (run with `tsx`).
2. Connect with `DATABASE_URL`. If `schema_migration` doesn't exist, every file is pending.
3. List `db/` files matching `^\d{3}_.+\.sql$`, sorted by name. Skip versions already in `schema_migration` (version = file name without `.sql`).
4. For each pending file: run the file's SQL. 001 already has its own BEGIN/COMMIT. For later files, the convention is the same: each file wraps itself in BEGIN/COMMIT and inserts its own `schema_migration` row. Document this at the top of migrate.ts.
5. After each file, verify the row now exists. Fail loudly if a file forgot to insert it.
6. Print `applied 002_auth` lines. Print `nothing to do` if none.
7. Make `db/` a small npm workspace `@hh/db` (`db/package.json`, add `"db"` to the root `workspaces`) with deps `pg`, `tsx` and dev deps `vitest`, `@types/pg`. Its `test` script runs `vitest run`, so `npm test` includes the DB tests. Export `migrate(databaseUrl, dir)` from `db/migrate.ts` so tests can call it; the CLI part only runs when the file is executed directly. Add root script `"db:migrate": "tsx db/migrate.ts"`.
8. Add `"db:reset"` (`tsx db/migrate.ts --reset`) that drops and recreates the `public` schema, then migrates. Refuse to run unless the URL's database name ends in `_dev` or `_test`.
9. CI: add a `postgres:16` service to `.github/workflows/ci.yml` (user/password `hh`, database `hh_test`), set `DATABASE_URL=postgres://hh:hh@localhost:5432/hh_test` for the job, and run `npm run db:reset` before `npm test`, so integration tests run in CI instead of being skipped.

## Done when
- [x] On a fresh DB, `npm run db:migrate` applies 001. Running it again prints `nothing to do`.
- [x] `npm run db:reset` works on hh_dev and refuses on any other DB name.

## Tests
- Integration test against a `_test` database: fresh → applies all; second run → no-op; a broken migration file in a temp dir → exits non-zero and leaves `schema_migration` unchanged

## Out of scope
- Down migrations.
- Running migrations automatically on API start.
