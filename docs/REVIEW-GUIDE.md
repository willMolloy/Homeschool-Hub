# Review guide

A short guide for reviewing Homeschool Hub on your own machine. It's written for a Java/SQL backend developer who is new to this TypeScript stack.

- **What exists today:** Sprint 1 and Sprint 2a are done, and Sprint 2b's weights are in. You can sign in, manage kids and subjects (with optional default weights), enter schedule data (settings, assignments with a thickness picker, days off, events), and see the engine's plan in a temporary debug table.
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

1. **Plan (`/`), the This Week page**
   - One table per child, with effort (units × weight) per subject per day. See [Weights](#weights).
   - Use the **‹ This week ›** switcher in the header to change the week.
   - Above the tables, the card asks "How did last week go?". Try *Adjust*: tap an assignment to open it, move a slider, pick how to absorb the difference and save. The following weeks change. *Skip* counts as done.
   - Each child has **Make an adjustment** beside their name. It opens that child's rows for last week (or for the week shown, once it's over) in a sheet: a bottom drawer on a phone, a dialog on a wide screen. To revisit an earlier week, go back to it with the switcher and use the same button.
   - Developer extras ("Plan as of", weight markers `~`/`s`, the engine version) show only in a dev build with `?debug=1` in the URL. For example, `/?debug=1&asOf=2026-10-19&week=2026-10-26` shows Frank's Literature at 45 a day.
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
| `docs/tickets` | Sprint 1, 2a and 2b tickets, each with "Done when" and tests | Your Jira |
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

- `001_init.sql` … `007_drop_minutes_per_unit.sql`: forward-only migrations, applied in order by `db/migrate.ts` and recorded in `schema_migration` (like Flyway's history table). 004–007 are Sprint 2b's weights, done expand/contract: 004 adds `assignment.weight_per_unit` (backfilled from the old minutes ÷ 2), 005 adds the `weight_choice` history, 006 adds subject default weights, and 007 drops the old minutes column once nothing reads it. See `db/README.md`.
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

**CI:** `.github/workflows/ci.yml` runs Postgres 16, then lint, typecheck, db:reset, test, and test:tz. It runs on every push to `main`; check it with `gh run list`.

## Weights

Sprint 2b replaced the old per-unit minutes with a relative **weight per unit**: how much effort one page, chapter, lesson or minute is. A bar's thickness for a day is `units × weight`. Thickness has no unit; 1 point ≈ 2 minutes of work (`MINUTES_PER_WEIGHT_POINT`), which is only used for the picker's "≈ N min of work" caption. Logged hours come from `log_entry.minutes_spent`, never from bars.

- **Built-ins** (`DEFAULT_WEIGHT_PER_UNIT` in `packages/engine/src/weights.ts`): pages 1, chapters 10, lessons 15, minutes 0.5 (so 30 minutes of piano and 15 pages are both thickness 15).
- **Bounds:** 0.01–100 with at most 2 decimals (`isValidWeight`). The API returns 400 outside them, and the DB has CHECKs (the `numeric(6,2)` columns round a third decimal rather than reject it; tester findings T3-1/T4-1). The picker offers None / Light ×0.5 / Normal ×1 / Heavy ×1.5 / Very heavy ×2 / Custom.
- **Precedence** for a new assignment's suggested weight (`GET /api/weights/suggestion`, `suggestWeight`): the assignment's own value → the children's learned weight (pages and chapters only) → the subject's default for that unit type → the built-in. In the plan (`weightPerUnitOf`) it's the assignment's own value → the subject default → the built-in, and each plan says which (`weightSource`).
- **Learned weight (trimmed mean):** per child and unit, take the latest choice on each of their 5 most recent pages (or chapters) assignments. With 4 or 5 values, drop the single highest and lowest and average the rest; with 1–3, the plain mean; with none, fall back to the subject default, then the built-in. Rounded to 2 decimals. A cleared weight removes that assignment's vote. Lessons and minutes are never learned.
- **Several children:** the median of the usual weights of the children who have one. Children without history are listed in the response so the hint can say so.
- **Snapshot vs live:** a learned (or typed) value is saved on the assignment, so it doesn't change later. An assignment with no weight of its own follows its subject's default live: edit the subject and the next plan uses the new value. A subject default is bound to one unit type (20 per lesson isn't 20 per page).

### Sprint 2b decisions

DeeDee settled D1, D5, D6, D14, D17 and the precedence on Oct 28, 2026, and approved the revised tickets with the rest (including D17–D23) as written the same day. Copied from `docs/tickets/sprint-2b-weights/README.md`:

| ID | Decision | Chosen | Decided |
|----|----------|--------|---------|
| D1 | Minutes ↔ points | 2 minutes = 1 point; migration 004 converts minutes ÷ 2, capped | Oct 28, 2026 |
| D5 | Usual weight | Latest weight on the 5 most recent assignments of that unit per child; drop the high and low, average the rest | Oct 28, 2026 |
| D6 | Several children | Median of the per-child usual weights | Oct 28, 2026 |
| D14 | Skipping the weekly card | Counts as done; the card never nags | Oct 28, 2026 |
| — | Precedence | Assignment → learned → subject → built-in | Oct 28, 2026 |
| D17 | Chapters learned like pages | Yes | Oct 28, 2026 |
| D18 | Fewer than 5 assignments | 4 → drop high and low, average the middle 2; 1–3 → plain mean; 0 → fall back | Oct 28, 2026 |
| D19 | Subject default vs learned (pages, chapters) | Learned wins; the subject default fills in for children without history | Oct 28, 2026 |
| D20 | Subject default: snapshot or live | Live for assignments without their own weight; learned values are stored on the assignment | Oct 28, 2026 |
| D21 | Weights on lessons and minutes | Allowed (minute built-in 0.5); never learned | Oct 28, 2026 |
| D22 | Picker presets | None / Light ×0.5 / Normal ×1 / Heavy ×1.5 / Very heavy ×2 / Custom | Oct 28, 2026 |
| D23 | Subject default bound to one unit type | Yes | Oct 28, 2026 |
| D2 | Weight bounds | 0.01–100, 2 decimals | Oct 28, 2026 |
| D3 | Existing minute values | ÷ 2, capped; 0 or NULL → default | Oct 28, 2026 |
| D4 | Where choices are stored | A separate `weight_choice` table | Oct 28, 2026 |
| D7 | Unit change on edit | Must resend a weight (400 otherwise) | Oct 28, 2026 |
| D8 | Archived children and subjects in suggestions | Allowed | Oct 28, 2026 |
| D9 | Past bars in a checked-in week | Scaled to actual | Oct 28, 2026 |
| D10 | Default absorb choice | Keep the end date (thicken or thin) | Oct 28, 2026 |
| D11 | On-plan tolerance | ±0.5 units | Oct 28, 2026 |
| D12 | Preview numbers on the absorb choices | Not in v1 | Oct 28, 2026 |
| D13 | Position meaning | Units done since the start; no start page | Oct 28, 2026 |
| D15 | Engine versions | 0.2.0, 0.3.0, 0.4.0, 0.5.0, with a patch bump for S2b-32; 0.6.0 for S2b-38 | Oct 28, 2026 |
| D16 | Hours and exports | Only from `log_entry.minutes_spent` | Oct 28, 2026 |
| D24 | Editing an earlier check-in | The latest check-in is authoritative for everything after it (S2b-38, engine 0.6.0) | Oct 28, 2026 |

## Progress

Sprint 2b (S2b-18 … S2b-29) replaced "progress = what was logged" with **assumed progress**: the plan assumes each week's scheduled work was done, and a parent corrects it only when it wasn't.

- **No rollover.** Unlogged work never piles onto later days, so the plan for a week is the same whatever "today" is. Logs (`log_entry`, `log_child_progress`) feed hours and exports only (D16); they never move the plan.
- **Check-ins.** Once a week the card asks about last week (Monday–Sunday). *Last week went as planned* or *Skip* stores a review and nothing else; *Adjust* lets the parent set where each child really is (units done since the start, D13). Only changed positions are stored (`progress_checkin`); no row means "as planned". The plan re-anchors on the latest check-in before each week (S2b-20), and the past days of a checked-in week are scaled to the actual (D9).
- **Two absorb modes** when the actual differs from the plan (±0.5 units counts as on plan, D11): **keep the end date** (`keepEndDate`, the default, D10) spreads the difference over the remaining days, so bars thicken or thin; **push the end date** (`pushEndDate`) keeps the same pace and moves the end. Reaching the total finishes the assignment early and asks nothing.
- **Skip = done** (D14). A skipped week is stored as `skipped` and the card never comes back for it; it can still be edited later from "Review a past week".
- **Editing a past week** saves it as reviewed and changes only the weeks after it. **The latest check-in is authoritative** (D24, S2b-38): if a later week has a check-in, nothing after that later check-in changes, because each check-in replans from its own position with the original plan's end (keep) or pace (push), never from what an earlier check-in did. With no later check-in, the edit replans everything after it. If an earlier push carried the work past the original end, a later *keep* has no end left to keep and goes at the original pace.
- **API:**
  - `GET /api/check-ins[?weekStart=YYYY-MM-DD]`: one week's items (planned vs actual, mode) and its review status; without `weekStart`, last week.
  - `PUT /api/check-ins/:weekStart` with `{ status: "reviewed" | "skipped", items: [{ assignmentId, childId, position, mode }] }`: saves the week in one transaction and returns whether the plan changed. Only past weeks; positions 0…total with at most 2 decimals.
  - `GET /api/check-ins/weeks`: finished weeks that can be reopened (up to 104), newest first, with their status.
- **Tables:** migration 008 (`progress_checkin`, `week_review`); see `db/README.md`.

## 4. Decisions waiting for you

The list, with context, is in the [Morning summary](progress/overnight.md#morning-summary), under "Decisions for DeeDee". The most important ones:

1. **Week-override rule:** this blocks the week-overrides API.

The asOf/rollover question and the seed-logs question from Sprint 1 are settled by Sprint 2b's assumed progress (S2b-18): nothing rolls forward, and logs no longer affect the plan.

The rest of the list covers removal (hard-delete vs. archive), limits, time-zone handling, sessions and name policy, plus sign-off on the earlier deviations. Each ticket row in that file explains what was built and why.
