# Developer self-review: SOLID and best practices

*Reviewer:* the developer (self-review, written honestly). *Code reviewed:* `fce9a09` (Oct 28, 2026, CT). *Scope:* `packages/engine`, `apps/api`, `apps/web`, `db`, CI and dependencies.
This is a read-only review. No source or test files were changed.

DeeDee asked for this review to check whether SOLID principles and best practices were followed. They are running a solo, vibe-coded MVP for one family pilot, so I've judged each finding against that context. Where I think something is a reasonable simplicity tradeoff, I say so rather than recommend architecture the product doesn't need yet.

**Severity scale.** High means it could cause wrong plans, data loss or a security hole now. Medium is a real maintenance, operations or scale risk to fix soon. Low is a smell or polish item.
**Effort scale.** S is under 2 hours, M is half a day to a day, and L is more than a day.

## Summary

| Severity | Count |
|---|---|
| High | 0 |
| Medium | 10 |
| Low | 20 |

I found nothing high. Every query is scoped by family, all SQL is parameterized, auth is deny-by-default, the engine is pure and heavily tested (153 tests × 7 zones), and `npm audit` reports 0 vulnerabilities.

The medium findings fall into three groups:
- **Production operation.** Logs are off, and the plan load can use up the connection pool.
- **Hidden contracts.** Transactions, enums and the API types are kept in step by convention, not by code.
- **Duplication.** It has built up across the four CRUD resources.

### What's already in good shape
- **Engine purity and dependency inversion.** The engine has no I/O and no `Date`; `asOf` is injected. `CapacityModel` is a small interface that `planChild` accepts, so it can be swapped in tests (`capacity.ts:11-14`, `plan.ts:54`). Adding a unit type is compile-checked inside the engine through `Record<UnitType, …>` (`units.ts:4`).
- **Config is injected.** `loadConfig(env)` uses zod, `buildApp(config, opts)` takes the config, and the pool is built from config and decorated onto the app (`config.ts`, `db.ts`, `app.ts`). Tests build their own app against `hh_test`.
- **Auth is deny-by-default.** Routes must opt out with `config.public` (`auth/session.ts:43`). Session tokens are stored hashed, and password checks use `timingSafeEqual`.
- **SQL safety.** Every value is a `$n` parameter. The only interpolated identifiers are a closed `"child" | "subject"` union (`rosterRepo.ts:49,63`) and column names that are code constants in the SET builders. Cross-family references are blocked twice: once by composite FKs `(id, family_id)` in `001_init.sql`, and again by `checkRefs`.
- **Transactions for multi-row writes.** These are explicit in the routes, using `withTransaction` plus `SELECT … FOR UPDATE` locks (`db.ts:28-41`, `assignmentRepo.ts:95-99`).
- **One central error handler** (`app.ts:45-58`) maps zod, Fastify and `HttpError` errors to `{error, message}`, and 500s never leak internals.
- **Liskov substitution.** `rosterRepo` is one generic repo shared by children and subjects. Each wrapper (`childRepo.ts`, `subjectRepo.ts`) is fully substitutable, and neither strengthens preconditions. The subject-name 409 is mapped in the subjects route, not hidden in a subclass. The one LSP-like problem is `Queryable`, which behaves differently depending on its runtime type (finding M3).
- **Open/closed in the web app.** `ScheduleList<T>` (`ScheduleList.tsx:49`) is a real extension point: Assignments, Days off and Events are each just a `renderCard`/`renderForm` pair passed to it. A new schedule resource needs no change to the list code.

---

## Medium findings

### M1. Production and test run with logging turned off
- **Where:**
  - `apps/api/src/app.ts:39`: `logger: config.NODE_ENV === "development" ? { level: "warn" } : false`
  - `apps/api/src/db.ts:17`: the pool `error` handler swallows errors silently.
  - `apps/api/src/routes/plan.ts:56`: the `req.log.warn` for a bad stored time zone goes nowhere in production.
- **Principle:** best practice (observability) and error handling.
- **Why it matters:** in production, the 500 handler's `app.log.error(err)` writes to a no-op logger. The first real bug a family hits would leave no trace at all, and idle-client errors from the pool would vanish too.
- **Fix:**
  - Log at `info` in production and `silent` only in test, through a `LOG_LEVEL` config key with defaults per `NODE_ENV`.
  - Add redaction for `req.headers.cookie` and the login body.
  - Make the pool error handler call `app.log.error`.
- **Effort:** S

### M2. The plan load runs 11 queries in parallel on a 10-connection pool, with no consistent snapshot
- **Where:** `apps/api/src/plan/loadPlanInputs.ts:51-87` (`Promise.all` of 11 `query(db, …)` calls on the Pool), and `apps/api/src/db.ts:15` (`max: 10`).
- **Principle:** performance and transaction boundaries.
- **Why it matters:**
  - **Pool capacity.** Each query checks out its own pool client, so one `GET /api/plan` can hold every connection. Two families loading the plan at the same moment queue behind each other, and any other request waits up to `connectionTimeoutMillis: 3000` before failing.
  - **Torn reads.** The 11 reads run at slightly different times. A write committed partway through can be half-seen. For example, an assignment could be read before its new `assignment_child` row lands, so it is planned for nobody. The plan would be off for that one request.
- **Fix:** run the reads one after another on a single client inside `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, using a `withReadSnapshot(pool, fn)` helper next to `withTransaction`. Each query is around 1 ms at this scale, so running them in sequence costs nothing noticeable. That one change fixes both problems.
- **Effort:** S

### M3. "Call inside a transaction" is a comment, not a type, and `rosterRepo` silently switches behavior
- **Where:**
  - `apps/api/src/db.ts`: the `Queryable` type is `Pool | PoolClient`.
  - `apps/api/src/repos/rosterRepo.ts:9`: `isPool` duck typing.
  - `rosterRepo.ts:70`: `create()` opens its own transaction when given a Pool and joins the caller's when given a client.
  - `repos/assignmentRepo.ts:82,95,101` and `repos/eventRepo.ts:79,103,117`: the doc comments that say "Call inside a transaction".
- **Principle:** Liskov substitution and interface segregation (a `Pool` and a `PoolClient` are not substitutable for these functions), plus transaction boundaries.
- **Why it matters:**
  - Every multi-statement repo function accepts a bare Pool. A future route that calls `createAssignment(app.db, …)` would type-check, then autocommit the assignment row and its child links separately, leaving a childless assignment if the second insert fails.
  - `lockAssignment(app.db, …)` would take a row lock and release it immediately.
  - `rosterRepo.create` hides where its transaction boundary is, which is surprising.
- **Fix:**
  - Introduce `type Tx = PoolClient & { readonly __tx: true }`, branded by `withTransaction` only.
  - Type every multi-statement or locking repo function to take `Tx`. Single-statement reads keep `Queryable`.
  - Drop `isPool`. `rosterRepo.create` takes `Tx`, and the two routes that call it wrap the call in `withTransaction`, as the schedule routes already do.
- **Effort:** S

### M4. Unit types, event rules, block kinds and weekdays are listed by hand in several places
- **Where:**
  - **Unit types:**
    - `packages/engine/src/types.ts:9` (`UnitType`)
    - `apps/api/src/routes/assignments.ts:13`: a hand-written `z.enum([...])`.
    - `db/001_init.sql:68`: the `CHECK`.
    - `apps/web/src/features/schedule/AssignmentsPage.tsx:13`: the labels. These are compile-checked, which is fine.
  - **Rules:**
    - `packages/engine/src/types.ts:12` (`SubjectRule`)
    - `apps/api/src/routes/events.ts:17,32,97`: three spellings of the same literal union.
    - `apps/web/src/api/types.ts:93`: a separate `EventRule`.
    - `db/001_init.sql:107,130`
  - **Block kinds:** `routes/blockedRanges.ts` and `repos/blockedRangeRepo.ts:8`.
  - **Weekdays:** `routes/family.ts:17-22` duplicates `http/scheduleLimits.ts:52-57`.
- **Principle:** open/closed and DRY.
- **Why it matters:** adding a unit type such as `problems` means editing about 4 files plus a migration. The API's zod enum is not linked to the engine type, so forgetting it makes the API reject a type that the engine and web already accept. TypeScript would not catch that.
- **Fix:**
  - Export `const UNIT_TYPES = ["pages","chapters","lessons","minutes"] as const` from the engine and derive `UnitType` from it. Do the same for `SUBJECT_RULES` and `OVERRIDE_MODES`.
  - The API uses `z.enum(UNIT_TYPES)`, and the web imports the types from the engine instead of redefining `EventRule`.
  - Add one db test that compares each `CHECK` list with the engine constant, through `pg_get_constraintdef`. The DB stays the final gate, but drift then fails a test.
  - Use one `Weekdays` schema from `scheduleLimits.ts` in `family.ts`.
- **Effort:** S

### M5. The API contract is copied into the web app by hand, including the validation limits
- **Where:**
  - `apps/web/src/api/types.ts:1`, which says "Kept in sync with apps/api by hand".
  - The `LIMITS` "Mirrors apps/api…" constants in `AssignmentsPage.tsx:10-11`, `DaysOffPage.tsx:9-10` and `EventsPage.tsx:9-10`.
  - The fake API's canned bodies in `apps/web/test/helpers/fake-api.ts`.
- **Principle:** dependency inversion (both sides should depend on a shared contract, not on each other's copies) and DRY.
- **Why it matters:**
  - Renaming a JSON field or changing a limit on the API side compiles cleanly, and the web tests still pass, because the fake API returns the old shape.
  - The failure would only show up against a live server.
  - This is the main way the web and API can drift apart without anything noticing.
- **Fix:** add a `packages/contract` workspace. It holds:
  - The zod request schemas and limits that the API already has (moved there).
  - The response types, exported as `z.infer`.

  The web imports types and `LIMITS` from it. The fake API can `satisfies` the response types. The web keeps hand-written UX messages; only the numbers and shapes become shared.
- **Effort:** M. This is a good investment before the next batch of screens; it isn't urgent today.

### M6. The dynamic UPDATE builder, child-link replacement and lock-then-get are each written 3–4 times
- **Where:**
  - **SET builders:** `rosterRepo.ts:74-91`, `assignmentRepo.ts:102-117`, `eventRepo.ts:118-135` and `blockedRangeRepo.ts:81-92`.
  - **Child-link replacement:** `assignmentRepo.ts:76-80` (this copy has no empty-list guard, unlike the others), `eventRepo.ts:85-90` and `blockedRangeRepo.ts:64-69`.
  - **Lock plus get:** `assignmentRepo.ts:96-99`, `eventRepo.ts:80-83` and `blockedRangeRepo.ts:59-62`.
- **Principle:** DRY and single responsibility (each repo also carries generic SQL-building code).
- **Why it matters:** four copies of hand-built `SET col = $n` code are four chances for an off-by-one in the `$n` numbering, and the copies have already started to diverge (the missing guard). Each new resource (week overrides, logging) would add a fifth copy.
- **Fix:**
  - Add `buildUpdate(table, idCol, patch, columnMap)`, which returns `{text, values}` from a fixed `columnMap` of field to column. The column whitelist keeps SQL safety in one place.
  - Add `replaceLinks(tx, table, ownerCol, ownerId, familyId, childIds)`.
  - Unit-test both helpers once.
- **Effort:** S–M

### M7. The plan-load queries filter by family but the event and link tables have no index on family_id
- **Where:**
  - `db/001_init.sql:96-112`: `event` has only `UNIQUE (id, family_id)`, whose index starts with `id`.
  - The link tables `assignment_child` (85-93), `event_child` (116), `event_subject_rule` (126) and `blocked_range_child` (152), and also `week_override` (164).
  - These are all queried `WHERE family_id = $1` in `loadPlanInputs.ts:51-87`.
- **Principle:** performance.
- **Why it matters:** every plan request scans these tables in full across all families. That's invisible with one pilot family, but the cost grows with the total number of families rather than with the requesting family's own data.
- **Fix:** a `003_family_indexes.sql` migration that adds `(family_id)` indexes, or `(family_id, …)` composites where they help. The scheduled `validate.sql` can also assert that the indexes exist.
- **Effort:** S. It can wait until there is a second real family, but it's cheap.

### M8. `HttpError` lives in `app.ts`, and validation and repo code throw HTTP errors
- **Where:**
  - `apps/api/src/app.ts:27-31` defines `HttpError`.
  - `http/validate.ts:2`, `http/scheduleLimits.ts:70-74`, `repos/refs.ts:14` and every route import it from `../app`.
  - `refs.ts:19` works out the field name from the list length.
- **Principle:** dependency inversion and layering. Low-level modules depend on the app composition root, and `app.ts` imports the routes, which import `app.ts`.
- **Why it matters:**
  - **Circular import.** This works today only because of how ES modules bind names at runtime. A top-level use of `HttpError` in one of those modules would hit a temporal dead zone (TDZ) error.
  - **Repos depend on HTTP.** A repo that throws HTTP 400s can't be reused from the CLI or a background job without dragging HTTP semantics along.
- **Fix:**
  - Move `HttpError` to `http/errors.ts`.
  - Have `checkRefs` return the missing ids, or throw a `MissingReferenceError` that the error handler maps to 400. Pass the field name explicitly rather than inferring it.
  - Have `checkDateOrder` return an issue rather than throw.
- **Effort:** S

### M9. `planChild` is one 190-line function, and a new override mode means editing it
- **Where:** `packages/engine/src/plan.ts:54-241`. It handles progress tallying (`:67-79`), override preparation, the two mode branches (`:155-190`) and output shaping (`:194-240`) in one body.
- **Principle:** single responsibility and open/closed.
- **Why it matters:**
  - This is the riskiest code in the product, and it is hard to read in one pass.
  - A third mode, for example "spread over remaining weeks", has to go into the if/else chain.
- **Honest tradeoff:** it is covered by 153 tests, including invariants, frozen prototype regressions and adversarial tester cases, so refactoring it is low-risk but brings no user value today.
- **Fix:**
  - Extract `tallyProgress`, `applyOverrideWeeks`, `fillKeepEndDate` / `fillPushEndDate` (selected through a `Record<OverrideMode, Filler>`) and `buildDays`.
  - Do this when the week-overrides API lands, since that is when the code gets touched anyway.
- **Effort:** M

### M10. The main verification tools live outside the repo, and CI never runs a build
- **Where:**
  - The gate script is `/workspace/check.sh`, and the browser smoke and screenshot scripts are in `/tmp/shots/` (`flow.mjs`, `manifest-check.mjs`). Neither is in the repo.
  - `.github/workflows/ci.yml:34-39` runs lint, typecheck, db:reset, test and test:tz, but no `npm run build`, no `validate.sql` and no end-to-end run.
  - Web tests run only against the hand-written fake API (`apps/web/test/helpers/fake-api.ts`).
- **Principle:** test quality and best practice (reproducible verification).
- **Why it matters:**
  - **Can't be reproduced.** A fresh clone, or a reviewer such as the tester or DeeDee, can't rerun the end-to-end checks that the Morning summary relies on.
  - **Build failures slip through.** A Vite or tsc build break, which `typecheck` doesn't always catch (for example asset imports or env usage), would pass CI.
  - **No real browser-to-API test.** No automated check exercises the browser against the real API, which is exactly where the M5 drift would show up.
- **Fix:**
  - Commit `scripts/check.sh` and move the smoke flow to `e2e/` as one Playwright test that runs against `npm run demo`.
  - Add `npm run build` and the `validate.sql` run to CI, plus an optional e2e job.
- **Effort:** S–M

---

## Low findings

### L1. Inline SQL in routes and the session hook, and no `familyRepo`
- **Where:**
  - `routes/me.ts:13` and `routes/family.ts:34,41`, which also define two near-identical `FamilyRow` types and mappers (`family.ts:11-14`, `me.ts:4-9`).
  - `routes/auth.ts:21-22,30-32`, `routes/plan.ts:54` and `auth/session.ts:49-58`.
- **Principle:** single responsibility and consistent layering.
- **Why it matters:** routes for the four resources go through repos, but family, auth and session go straight to SQL, so a reader has to learn two styles. The family row is mapped in two places.
- **Fix:** a `familyRepo` (`getFamily`, `updateFamily`, `findLogin`) and a `sessionRepo` (`find`, `touch`, `create`, `delete`, `purgeExpired`), with one family mapper.
- **Effort:** S

### L2. The plan route re-reads the family, and "family no longer exists" is written three times
- **Where:**
  - `routes/plan.ts:54-55` selects `time_zone` separately, although `loadPlanInputs` reads the family row anyway.
  - The same 401 message appears in `me.ts:15`, `family.ts:30` and `plan.ts:55`.
- **Principle:** DRY and performance (one extra round trip per plan request).
- **Fix:** have `loadPlanInputs` return `timeZone` and compute `asOf` from it, and add a `familyGone()` error factory. Also, `FamilyNotFoundError` from `loadPlanInputs` currently surfaces as a 500 when a family is deleted mid-request; map it to the same 401.
- **Effort:** S

### L3. The clock can't be injected at the app level
- **Where:**
  - `routes/plan.ts:23-25`: `localToday(now = new Date())` takes a `now`, but the route always uses the real clock (`:57`).
  - Sessions use the DB's `now()`.
  - `web/src/features/plan/PlanDebugView.tsx:39`: `deviceToday()` uses the device's zone, while the server's default `asOf` uses the family's zone.
- **Principle:** dependency inversion.
- **Why it matters:** "today" tests have to pass `asOf` explicitly or depend on the wall clock. Near midnight, the debug view can show the device's week while the server plans from the family's today.
- **Fix:** add `BuildOptions.clock?: () => Date` and `app.decorate("now", …)`. In the web app, derive the default week from `me.timeZone`, using the same helper as the server.
- **Effort:** S

### L4. Small validation helpers are repeated in many places
- **Where:**
  - **The NUL-character refine (5 copies):** `http/validate.ts:5-7`, `scheduleLimits.ts:60-61`, `routes/events.ts:15-16`, `routes/blockedRanges.ts:14-16` and `routes/auth.ts`.
  - **`ListQuery` / `includeArchived` parsing (4 copies):** `children.ts:8,19-20`, `subjects.ts:8,27-28`, `assignments.ts:11,48-49` and `events.ts:11,89-90`. It silently treats `?includeArchived=yes` as false, while the request bodies are strict.
  - **The `UUID_RE` → 404 guard (6 copies):** `assignments.ts:66`, `blockedRanges.ts:51,66`, `children.ts:31`, `events.ts:110` and `subjects.ts:40`.
  - **The "send at least one field" refine:** in every PATCH route.
  - **A duplicate Id schema:** `assignments.ts:12` repeats `IdList`.
- **Principle:** DRY and consistency.
- **Fix:** add `safeText(min, max, label)`, `listQuery`, `idParam` (a Fastify params schema, or `parseId(req)`) and `nonEmptyPatch(schema)` to `http/validate.ts`. Make `includeArchived` strict (`"true" | "false"`) so it returns 400 on anything else.
- **Effort:** S

### L5. Error responses are not all built the same way
- **Where:**
  - `auth/session.ts:47,53` send `{error}` with no message, directly through `reply`.
  - `routes/auth.ts:26` sends its 401 through `reply.send` instead of `HttpError`, and `:18` collapses the zod message.
  - `app.ts:42` (404).
  - `http/validate.ts:14-22` (`parseBody`) reports only the first issue.
  - Of the pg errors, only `subject_family_name_uq` is mapped (`pgErrors.ts`). Any other constraint violation becomes a 500. Pre-validation makes that unlikely, but the fallback is opaque.
- **Principle:** error-handling consistency.
- **Fix:**
  - Build every non-2xx through `HttpError` or one `sendError` helper, so each body has the same shape: `error` plus `message`.
  - Map `23503` (FK) and `23514` (check) to a 409 or 400 with a generic message, and log the detail.
  - Optionally return all zod issues as `issues[]`.
- **Effort:** S

### L6. The web app has two list-and-edit frameworks
- **Where:** `apps/web/src/features/roster/RosterPage.tsx:43-51`, which manages its own add, edit, archive, busy and error state, versus `ScheduleList.tsx:49-61`, which does the same for the schedule screens.
- **Principle:** DRY and open/closed.
- **Why it matters:** fixes to focus handling, the archive flow or error display have to be made twice. RosterPage came first (Sprint 1) and ScheduleList was generalized later.
- **Fix:** move RosterPage onto `ScheduleList`, which may need a `sections` prop for the two lists (Children and Subjects).
- **Effort:** M. Defer this; both are tested and work.

### L7. Form components hold 10–13 separate `useState` fields and validate imperatively
- **Where:** `EventsPage.tsx:87-100` (13 state hooks; the file is 255 lines), `AssignmentsPage.tsx:60-73` and `FamilySettingsPage.tsx:46-54`.
- **Principle:** component size and state management (SRP).
- **Why it matters:** each form re-implements error-map, submit, saving and form-error handling, and the files are getting long.
- **Honest tradeoff:** this is idiomatic React and easy to follow, and a form library would be over-engineering at this size.
- **Fix:** extract a `useFormState(initial, validate)` hook, or `useReducer`, plus a `<FieldError>` component. Validation would then come from the shared contract (M5).
- **Effort:** M. Defer until a fourth form.

### L8. The web API client trusts response shapes, and the 401 handler is a module global
- **Where:** `apps/web/src/api/client.ts:50` (`return data as T`) and `client.ts:14-22` (the module-level `unauthenticatedHandler`).
- **Principle:** type safety and dependency inversion.
- **Why it matters:** a wrong response shape fails deep inside a component instead of at the boundary. The global handler means only one `AuthProvider` can exist, which is fine for this app, and tests have to reset it.
- **Fix:** once M5 is done, optionally `parse` responses in development and test builds using the contract schemas. Keep the global handler; it's a reasonable simplicity choice.
- **Effort:** S (after M5).

### L9. The engine rescans all progress and overrides for every child plan
- **Where:** `packages/engine/src/plan.ts:30` (overrides) and `:68` (progress). The filter runs once per (assignment, child), so the cost is O(A·C·P).
- **Principle:** performance.
- **Why it matters:** this costs nothing today, because there is no progress logging yet. Once logging ships, P grows with A·C·days. The cost is still small (around 10⁵ operations for a large family), but it is the first hot spot.
- **Fix:** in `planAll`, group `progress` and `overrides` by `assignmentId:childId` once and pass the groups down.
- **Effort:** S. Defer until logging lands.

### L10. `mergeLane` accepts three input shapes and works out which one at runtime
- **Where:** `packages/engine/src/aggregate.ts:25-29` (`"capacity" in raw[0]`, plus casts).
- **Principle:** interface segregation and type safety.
- **Fix:** take only `LaneDay[][]` and have callers use `toLaneDays(plan.days)`. Alternatively, keep a thin overload, but don't inspect the input's shape at runtime.
- **Effort:** S

### L11. Each plan request computes the whole year, then trims it
- **Where:** `apps/api/src/routes/plan.ts:60-64`.
- **Principle:** performance.
- **Honest tradeoff:** this is deliberate. The full plan is needed for correct rates, it takes milliseconds, and caching would add invalidation bugs.
- **Fix:** if the timeline view gets heavy, cache by `(familyId, asOf, max(updated_at))`. Don't do this now.
- **Effort:** M. Defer.

### L12. Login throttling is per IP only, and the proxy is not trusted
- **Where:** `routes/auth.ts:14-15` uses `@fastify/rate-limit` keyed by IP, and `app.ts:39` does not set `trustProxy`.
- **Principle:** security.
- **Why it matters:** behind a reverse proxy, every user shares one IP, so one person's typos could lock everyone out. Meanwhile, a distributed attempt on one email address is not throttled at all.
- **Fix:** a per-email key alongside the per-IP key, and `trustProxy` set from config when the app is deployed.
- **Effort:** S

### L13. Expired sessions are never deleted
- **Where:** `db/002_auth.sql` (the `session` table, with no index on `expires_at`) and `auth/session.ts`.
- **Principle:** security hygiene and data growth.
- **Fix:** `DELETE FROM session WHERE expires_at < now()` on login, or on an hourly timer, plus an index on `expires_at`.
- **Effort:** S

### L14. The cookie secret is registered but unused, and the scrypt cost is modest
- **Where:** `app.ts:65`, where `SESSION_SECRET` is passed to `@fastify/cookie` but cookies aren't signed (open decision 10); and `auth/password.ts:3`, where `N = 16384`.
- **Principle:** security and clarity.
- **Why it matters:** the secret's presence suggests protection that isn't happening. The token is a random value stored hashed, so signing adds little; the real issue is the misleading config. N = 2¹⁴ is below current OWASP guidance of about 2¹⁷.
- **Fix:** either sign the cookie or remove the secret requirement, once decision 10 is settled. Raise N when deploying, keeping verification compatible through the stored parameters.
- **Effort:** S

### L15. Unchecked casts and non-null assertions
- **Where:**
  - `config.ts:34` (`as never`).
  - `plan/loadPlanInputs.ts:48,130` (`as Weekday[]`) and `:145` (`kind` typed as `string`).
  - `routes/events.ts:32,97` (literal-union casts).
  - `routes/assignments.ts:59,78` (`!` after a re-read).
  - `db.ts:22`: `query<T>` asserts the row type.
- **Principle:** type safety.
- **Honest tradeoff:** there are no `any` types in source, and the DB `CHECK` constraints back each cast. Typed raw SQL is a standard choice.
- **Fix:** remove the casts that M4 makes unnecessary, by deriving types from the engine constants. Replace the `!` with an explicit `if (!row) throw …`.
- **Effort:** S

### L16. The migration runner has no checksum and no lock, and parses `.env` itself
- **Where:** `db/migrate.ts:48-64` and `:91-99`. `apps/api` uses `dotenv` instead.
- **Principle:** best practice and DRY.
- **Why it matters:** an edited migration that has already been applied goes undetected, and two `migrate` processes running at once could race.
- **Fix:** store a sha256 of each file in `schema_migration` and fail on mismatch, wrap the run in `pg_advisory_lock`, and reuse one env loader.
- **Effort:** S

### L17. `set-family-login` changes the password and deletes sessions in two separate statements
- **Where:** `apps/api/src/cli/set-family-login.ts:61-67`.
- **Principle:** transaction boundaries.
- **Why it matters:** if the `DELETE` fails, the new login is set but old sessions stay valid.
- **Fix:** wrap both statements in `withTransaction`.
- **Effort:** S

### L18. Dependency hygiene
- **Where:**
  - `apps/api/package.json:8` (`"start": "tsx src/server.ts"`): production would compile TypeScript at runtime.
  - `db/package.json`: `tsx` is listed as a runtime dependency.
  - The pg version ranges differ (`db` ^8.13 vs `api` ^8.23).
  - Major versions are behind: Vite 5 (8 is out), Vitest 2 (4), React 18 (19), TypeScript 5.9 (7) and ESLint 9 (10).
- **Principle:** dependency hygiene.
- **Honest tradeoff:** `npm audit` reports 0 vulnerabilities, everything is locked, and staying on known-good majors during the MVP is sensible.
- **Fix:** add a `tsc` build for the API before deploying (or ship it bundled), and line up the pg ranges. Plan one "majors" pass after the pilot; don't do it now.
- **Effort:** S now (API build), M later (majors).

### L19. No graceful shutdown
- **Where:** `apps/api/src/server.ts`.
- **Principle:** best practice (operations).
- **Fix:** on `SIGTERM`/`SIGINT`, call `await app.close()`, which drains requests and closes the pool through an `onClose` hook.
- **Effort:** S

### L20. Naming drift
- **Where:**
  - One concept goes by three names: "blocked range" (DB and API), "days off" (UI) and `BlockedPeriod` (engine).
  - `http/validate.ts` exports `Name` (60 characters), while `routes/events.ts` defines its own local `Name` (120).
- **Principle:** naming.
- **Fix:** keep the DB and API names, but add a glossary line to `docs/` and rename the local schema to `EventName`.
- **Effort:** S

---

## Principle-by-principle summary

- **Single responsibility.** Mostly good. Routes parse, open the transaction, call repos and map results. Repos own the SQL. The engine owns the planning math.
  - The exceptions are inline SQL in family, auth, session and plan (L1), generic SQL builders copied into each repo (M6), and one oversized engine function (M9).
  - There is no service layer. Business rules, such as "archived children keep their rules", live in route handlers. That is fine for an MVP of this size; extract services when logging adds cross-resource rules.
- **Open/closed.**
  - A new schedule screen is open for extension through `ScheduleList`.
  - A new API resource needs one `app.register` line in `app.ts:85-94`. That's acceptable; a plugin registry would be over-engineering.
  - A new unit type or rule is not closed for modification, because the lists are spread across packages (M4). A new override mode means editing `planChild` (M9).
- **Liskov substitution.** `rosterRepo` and its two wrappers substitute cleanly. `Queryable` is the violation: a Pool and a client behave differently in multi-statement functions (M3).
- **Interface segregation.** API surfaces are small, and the web client is four functions. `ScheduleList` takes 11 props, which is acceptable for a generic list. `mergeLane`'s union input is the one fat interface (L10). Engine types are shared without fat props.
- **Dependency inversion.**
  - Strong at the edges: config, pool and model are injected, and the engine is pure.
  - Weak spots:
    - `HttpError` is imported from the composition root (M8).
    - The clock is not injected (L3).
    - The web app depends on a hand-copied contract (M5).

## Top 5 to do now
All five are S effort, about a day in total. None changes behavior a user would see.
1. **M1: production logging and pool error logging.** Without it, the first production bug is invisible.
2. **M2: plan reads on one client in a read-only REPEATABLE READ snapshot.** This fixes both pool exhaustion and torn reads in one small change.
3. **M3: a branded `Tx` type for multi-statement repo functions, and removing `isPool`.** This turns a comment-level contract into a compile error before week overrides and logging add more transactional code.
4. **M4: unit types, rules and modes from engine constants, plus a db test that checks the `CHECK` lists against them.** It makes the most likely next feature change safe.
5. **M10: commit `check.sh` and the smoke flow into the repo, and add `build` and `validate.sql` to CI.** This lets anyone, including DeeDee, reproduce the gate.

**Next tier** (also cheap, so do them when you're in that code): M8 (move `HttpError` to `http/errors.ts`), M6 (shared SET builder and `replaceLinks`), M7 (the family_id index migration), L4, L5, L13 and L17.

## Defer
- **M5 (shared contract package):** do it before the next batch of screens, not today.
- **M9 (split `planChild`):** do it with the week-overrides API.
- **L6 and L7 (web list and form refactors):** they work and are tested; revisit with a fourth form.
- **L9 and L11 (engine and plan performance):** they don't matter until progress logging exists and real usage grows.
- **L14 (signing the cookie):** waits on decision 10.
- **L12 and the API build part of L18:** do them as part of deployment prep.
- **L18's major-version upgrades:** after the pilot.
- **L20:** naming polish.
