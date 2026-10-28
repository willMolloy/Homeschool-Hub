# Review guide

A short guide for reviewing Homeschool Hub on your own machine. It's written for a Java/SQL backend developer who is new to this TypeScript stack.

- **What exists today:** Sprint 1 and Sprint 2a are done. You can sign in, manage kids and subjects, enter schedule data (settings, assignments, days off, events), and see the engine's plan in a temporary debug table.
- **What doesn't exist yet:** the real timeline, logging, and the week-overrides API.
- **Status and open decisions:** see the [Morning summary](progress/overnight.md#morning-summary).

## 1. Run it (about 5 minutes)

You need:
- **Node 20** (`.nvmrc` says 20; it was built and tested on 20.19.2). With nvm: `nvm install && nvm use`.
- **Docker** with Compose, for Postgres 16.
- `openssl` (to generate a secret). Any random 32+ character string also works.

```sh
docker compose up -d db                       # Postgres 16 on localhost:5432 (user/password hh, database hh_dev)
docker compose ps                             # wait until the db service shows "healthy"
cp .env.example .env                          # then set SESSION_SECRET to the output of: openssl rand -hex 32
npm ci                                        # installs every workspace (like a multi-module Maven build)
npm run demo                                  # resets and seeds hh_dev, starts API + web, prints the login
```

`npm run demo` prints something like:

```
Homeschool Hub demo is ready.
  Open:     http://localhost:5173
  Sign in:  demo@example.com / demo-password
  API:      http://localhost:3000/api/health
```

Press **Ctrl+C** to stop both servers. Running `npm run demo` again wipes hh_dev back to the demo family.

**About the demo command:**
- It only runs against a database whose name ends in `_dev`, and it refuses `NODE_ENV=production`.
- An exported `DATABASE_URL` takes priority over `.env`. If it says "refusing to reset database …", run `unset DATABASE_URL`.

**Run the tests and checks (the same steps CI runs):**

```sh
docker compose exec db createdb -U hh hh_test               # once
export DATABASE_URL=postgres://hh:hh@localhost:5432/hh_test
npm run lint && npm run typecheck && npm run build
npm run db:reset                                            # migrates hh_test from scratch
npm test                                                    # engine, api, web, db
npm run test:tz                                             # engine again under 7 time zones
unset DATABASE_URL                                          # so the demo goes back to hh_dev
```

Without `DATABASE_URL=…_test`, the integration tests are **skipped**, not failed, so check that the API count is in the hundreds. Expected counts are in the Morning summary.

**Caveat:** Docker wasn't available on the build box. The app was tested against the same Postgres 16 version with the same credentials, but `docker compose up` itself hasn't been tried.

## 2. A 10-minute click-through

Sign in at http://localhost:5173 with `demo@example.com` / `demo-password`. Try a narrow browser window too; the app is built mobile-first (360 px).

1. **Plan (`/`)**
   - This is a *debug view*: one table per child, with minutes per subject per day.
   - Use **Prev/Next** to change the week.
   - Set **"Plan as of"** to `2026-10-19` and go to the week of Oct 26. Frank's Literature reads 45 a day.
   - Clear "as of" (so it means today). The numbers go up because nothing is logged and the work rolls forward. That's decision 1 in the Morning summary.
   - A `*` means the minutes are an estimate.
2. **Kids and Subjects**
   - Add, rename, recolor, archive, and use "Show archived".
   - Try adding a subject whose name already exists. You get a 409 with a field message.
3. **Schedule → Settings**
   - Untick Wednesday and save, then look at Plan: Wednesday is 0 and the work moves to other days.
   - Look at the time-zone list. It comes from the server (`GET /api/timezones`).
   - Put Wednesday back.
4. **Schedule → Assignments**
   - Add one (for example 10 lessons, next week, one child) and watch that week's Plan totals go up.
   - Archive it and the plan goes back to what it was.
5. **Schedule → Days off**
   - Add a whole-family day off. That day goes to 0 on Plan.
   - Delete it. Days off are hard-deleted, unlike everything else (decision 4).
6. **Schedule → Events**
   - Add an event on one weekday with "Default for subjects" set to Skip. That day goes to 0.
   - Then try Lighter with a percentage, plus a per-subject rule or two.
   - Archive it.
7. **Rough edges worth poking:**
   - Sign out, then open `/schedule/events` directly. You go to login and come back after signing in.
   - Try an unknown URL.
   - Look at the footer's engine version.

If you want to see the API directly: in the browser devtools Network tab every call is JSON under `/api/…`, and `curl localhost:3000/api/health` works without signing in.

## 3. Repo map (for someone coming from Spring)

npm **workspaces** work like Maven modules: one root `package.json`, one lockfile, and each package has its own `package.json` and tests. Everything is TypeScript run directly by `tsx` in dev (no compile step) and type-checked by `tsc` (`npm run typecheck`).

| Path | What it is | Spring analogy |
|---|---|---|
| `packages/engine` (`@hh/engine`) | The scheduling engine: pure functions, no I/O, no `Date`. `plan()` in `src/plan.ts`; `ENGINE_VERSION` in `src/version.ts`. | A plain domain/service JAR with no Spring in it |
| `apps/api` (`@hh/api`) | Fastify HTTP API | The Spring Boot app |
| `apps/web` (`@hh/web`) | React single-page app (Vite dev server, PWA) | A separate frontend; nothing like Thymeleaf |
| `db` (`@hh/db`) | SQL migrations, the migration runner, seed, demo script, schema checks | Flyway scripts + a `data.sql` |
| `docs/tickets` | Sprint 1 and 2a tickets, each with "Done when" and tests | Your Jira |
| `docs/progress` | Overnight log (Morning summary) and the tester's report | — |

### API (`apps/api/src`)

| Where | What | Spring analogy |
|---|---|---|
| `server.ts` | Entry point: loads config, builds the app, listens on `PORT` | `main()` / `SpringApplication.run` |
| `app.ts` | `buildApp()`: registers plugins and routes, shared error handler (`HttpError` → `{error, message}` JSON) | `@Configuration` + `@ControllerAdvice` |
| `config.ts` | Env vars validated with zod (`PORT`, `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`); reads the repo-root `.env` | `@ConfigurationProperties` + `@Validated` |
| `routes/*.ts` | One file per resource (`children`, `subjects`, `assignments`, `blockedRanges` = days off, `events`, `family`, `me`, `plan`, `timezones`, `auth`) | `@RestController`s |
| `repos/*.ts` | Plain SQL through `pg` (no ORM); every query is scoped by `family_id` from the session. `refs.ts` checks that referenced rows belong to the family. | `@Repository` with `JdbcTemplate` |
| `http/validate.ts`, `http/scheduleLimits.ts`, `http/timeZone.ts` | zod schemas for request bodies (names, colours, limits, dates, time zones) | Bean Validation (`@NotNull`, `@Size`) + DTOs |
| `http/pgErrors.ts` | Maps Postgres errors (unique violation → 409) | A `DataIntegrityViolationException` handler |
| `db.ts` | `pg` connection pool, `query()`, `withTransaction()` | `DataSource` + `@Transactional` (explicit, not an annotation) |
| `auth/session.ts` | A hook that runs before every `/api/*` route and requires a session unless the route sets `config: { public: true }` | A Spring Security filter chain, deny by default |
| `auth/password.ts` | scrypt hashing | `PasswordEncoder` |
| `plan/loadPlanInputs.ts` | Loads one family's rows and shapes them into engine input; `routes/plan.ts` calls the engine | A service method assembling a DTO for the domain layer |
| `cli/set-family-login.ts` | Sets a family's login from the command line | A `CommandLineRunner` |

A route reads like this (from `routes/children.ts`): a zod schema describes the body, `parseBody` throws a 400 if it doesn't match, the repo does the SQL, and the handler returns an object that Fastify serializes to JSON.

### Database (`db/`)

- `001_init.sql`, `002_auth.sql`, `003_minutes_unit.sql`: forward-only migrations, applied in order by `db/migrate.ts` and recorded in `schema_migration` (like Flyway's history table).
- `npm run db:migrate` applies pending migrations; `npm run db:reset` drops and re-migrates. It only works on `*_dev` or `*_test` databases.
- `npm run db:seed`: the demo family (hh_dev only). `npm run demo`: reset + seed + servers.
- `db/test/validate.sql`: SQL assertions about the schema (constraints, cascades, indexes), run by `node db/test/validate.cjs`. See `db/README.md`.

### Web (`apps/web/src`)

| Where | What | Spring/Java analogy |
|---|---|---|
| `router.tsx` | The URL → page table (`/`, `/kids`, `/subjects`, `/schedule/...`, `/login`) | Request mappings, but client-side |
| `routes/`, `features/*` | Pages. `features/plan` is the debug view, `features/roster` is shared Kids/Subjects, and `features/schedule` covers Settings, Assignments, Days off and Events. | Views |
| `api/client.ts`, `api/useApi.ts`, `api/types.ts` | `fetch` wrapper (sends the cookie, turns errors into `ApiError`), a loading/error/data hook, and the JSON types | A `RestTemplate`/`WebClient` client + DTO classes |
| `auth/` | Who's signed in; redirects to login on a 401 | — |
| `layout/`, `ui/` | App shell (header, bottom tabs on mobile), confirm dialog, shared form styles | Layout templates |

In dev, Vite serves the web app on :5173 and proxies `/api` to the API on :3000, so the browser sees one origin.

### Tests

| Where | Runner | What they are |
|---|---|---|
| `packages/engine/test` | vitest | Unit tests plus invariants; `test:tz` reruns them under 7 time zones |
| `apps/api/test` | vitest | Mostly **integration tests**: the whole app is built in memory and requests go through `app.inject()` (like `MockMvc`) against a real Postgres `hh_test`. Helpers in `test/helpers/` (`hasDb`, `testPool`, `signedInFamily`). `tester*.test.ts` are the independent tester's. |
| `apps/web/test` | vitest + jsdom + Testing Library | Components rendered in a fake DOM against a fake API (`test/helpers/fake-api.ts`) |
| `db/test` | vitest | Migration runner, seed and demo, each against its own scratch database |

vitest works like JUnit 5: `describe` groups and `it` tests, with `expect(...)` instead of AssertJ. `it.fails` marks a known bug pinned by a test.

**CI:** `.github/workflows/ci.yml` runs Postgres 16, then lint, typecheck, db:reset, test, and test:tz. It has never run, because nothing has been pushed.

## 4. Decisions waiting for you

The list, with context, is in the [Morning summary](progress/overnight.md#morning-summary), under "Decisions for DeeDee". The most important ones:

1. **asOf semantics:** unlogged work rolls forward, so "today" shows catch-up numbers.
2. **Seed logs:** should the seed include some progress logs?
3. **Week-override rule:** this blocks the week-overrides API.

The rest of the list covers removal (hard-delete vs. archive), limits, time-zone handling, sessions and name policy, plus sign-off on the earlier deviations. Each ticket row in that file explains what was built and why.
