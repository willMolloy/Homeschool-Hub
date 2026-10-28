# S1-04 — Add a local Postgres with Docker Compose

**Depends on:** S1-01  
**Size:** XS

## Goal
`docker compose up -d db` starts a Postgres 16 that the API and migrations can use locally.

## Context
Schema `db/001_init.sql` is validated against PostgreSQL 18.4 and uses only features from PG13+. Everyone working on the project should run the same major version locally. 16 is a safe, widely hosted choice, and you can bump it later.

## Steps
1. Create `docker-compose.yml` at the repo root with one service `db`: image `postgres:16`, env `POSTGRES_USER=hh`, `POSTGRES_PASSWORD=hh`, `POSTGRES_DB=hh_dev`, port `5432:5432`, named volume `hh-pgdata`.
2. Add a healthcheck: `pg_isready -U hh`.
3. Create `.env.example` with `DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev`.
4. Make sure `.env` is in `.gitignore` (it already is). Copy `.env.example` to `.env` locally.
5. Document the commands in the root README under a 'Local database' heading.

## Done when
- [ ] `docker compose up -d db` then `psql postgres://hh:hh@localhost:5432/hh_dev -c 'select 1'` works.
- [ ] `DATABASE_URL=… node db/test/validate.cjs` against a fresh scratch DB prints `ALL CHECKS PASSED` (needs `pg` installed, see db/README.md).

## Tests
- Run the schema validation script once against the container.

## Out of scope
- Hosting or production DB.
