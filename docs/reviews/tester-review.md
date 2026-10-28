# Tester review: SOLID and best practices (Sprint 2a, at fce9a09)

Independent reviewer: the tester. Read-only pass over `packages/engine`, `apps/api`, `apps/web`, `db` and the tests.
The only change in this commit is this file. Written Wed Oct 28, 2026, about 7 AM CT.

**Lens.** This is a solo MVP that is heading into a pilot. I'm grading on whether a finding will hurt in the
next sprints (week overrides, logging, timeline) or in the pilot. Textbook purity isn't the bar. Where a "SOLID fix" would be
over-engineering, I say so.

**Severity.** High: likely to cause a pilot incident or block the next sprint. Medium: a real defect, inconsistency or drift risk that
gets more expensive with every sprint. Low: hygiene, or it only matters later. **Effort** is S (under 1 hour), M (half a day) or L (more than a day).

**Counts: 1 high, 9 medium, 17 low.**

---

## What's already good (keep doing it)

- **The engine is pure and injectable.** `packages/engine/src` never calls `Date`/`Date.now` (checked with grep). Dates are
  `LocalDate`/day numbers. `asOf` is an input. Capacity is an injected `CapacityModel` interface (`capacity.ts`),
  which is a textbook DIP seam. Bad input raises a typed `EngineInputError`.
- **Dependencies come in as parameters at the edges.** That covers `loadConfig(env)` (config.ts), `buildApp(config, { db })` (app.ts:33),
  `localToday(tz, now)` (routes/plan.ts) and `deviceToday(now)` (PlanDebugView.tsx:15). Repos take a `Queryable`, not a global pool.
- **Tenant isolation is enforced twice.** `familyId` only ever comes from the session hook. The schema also uses composite
  `(id, family_id)` foreign keys on every join table (001_init.sql:79, 90–91, 121–122, 132–133, 157–158, 174–175, 212–214).
  A child from family B can't be linked to family A's assignment, even if a route has a bug.
- **Security basics are right.** scrypt has parameter caps (auth/password.ts). Login uses a dummy hash so timing doesn't reveal accounts, plus a rate limit
  (routes/auth.ts). Session tokens are stored hashed. Sliding expiry. Event `subjectRules` are parsed by hand, so
  `__proto__` and similar keys are inert (events.ts:22–51). Non-JSON bodies are rejected, and tester.security.test.ts:215–216
  locks that in. That is what makes the SameSite=Lax cookie a sufficient CSRF defence.
- **Type safety is strong.** The base config has `strict` and `noUncheckedIndexedAccess` (tsconfig.base.json:6–7). There is one
  `as never` (config.ts:34, a dotenv typing gap) and no `any` or `@ts-ignore` in src.
- **Most tests test behaviour.**
  - Web tests query by role and label (about 370 uses). None of them select by class name or snapshot.
  - API tests go through `app.inject` against real Postgres. Each file creates and deletes its own families, so files run in parallel safely.
  - `plan-contract.test.ts` pins the API↔engine boundary.
  - The fake API answers 404 for unknown routes (fake-api.ts:54–55), so a missing stub fails loudly instead of hanging.
- **The PATCH pattern is consistent.** Each one runs lock, then the merged-date check, then `checkRefs` on new ids only, then update, then get, all inside one `withTransaction`. The forms send only
  the fields that changed.

---

## Findings

### High

**H-1. Production has no logs, and pool errors are discarded.** Area: best practice, plus a logging seam.
- **Where.** app.ts:39 sets `logger: NODE_ENV === "development" ? { level: "warn" } : false`. The 500 branch of the error handler
  (app.ts:45ff), the bad-zone warning at routes/plan.ts:57 (`req.log.warn(...)`) and db.ts:17 (`pool.on("error", () => {})`)
  all write to nothing in production.
- **Why it matters.** In the pilot, the first 500 or DB blip will leave no trace. The warning the developer added on purpose for
  bad stored zones can't be seen. The swallowed pool error is right not to crash the process, but it should still leave a log line.
- **Fix.** Add `LOG_LEVEL` to `loadConfig`, defaulting to `info` in production, `warn` in development and `silent` in test. Pass it to Fastify with
  `redact: ["req.headers.cookie", "res.headers['set-cookie']"]`. Change the pool error handler to `pool.on("error", (e) => log.warn({ err: e }, "idle pg client error"))`,
  with the logger passed into `createPool`. Log 500s at `error` along with the request id.
- **Effort:** S.

### Medium

**M-1. `loadPlanInputs` runs 11 parallel queries on the pool with no snapshot.** Area: best practice, reliability.
- **Where.** plan/loadPlanInputs.ts:51–87 (`Promise.all` of 11 `db.query` calls on `app.db`). The pool `max` is 10 (db.ts:15) and
  `connectionTimeoutMillis` is 3000.
- **Why it matters.** One `/api/plan` request can take every connection in the pool. Two of them at once, plus the session preHandler
  query, will queue, and under any load some requests time out as 500s. The 11 reads also see different moments in time, so a
  PATCH that lands between them can produce a plan that never existed. For example, an assignment's new child list could be read with the old child set. That gets worse once logging writes
  progress while the timeline is reading it.
- **Fix.** Run the loader on one client inside a `BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ` transaction, using a read-only variant of
  `withTransaction`. Run the queries one after another, or with `Promise.all` on the same client, which pg serialises anyway. The query
  count stays the same, and you get one connection and one snapshot. The existing load-plan-inputs.test.ts covers the behaviour.
- **Effort:** S.

**M-2. The web↔API contract is kept in sync by hand, including the test fixtures.** Areas: DIP and DRY.
- **Where.**
  - apps/web/src/api/types.ts:1 says "Kept in sync with apps/api by hand", even though apps/api already exports `AssignmentJson` and the other Json types.
  - The limit copies are at AssignmentsPage.tsx:10–11, EventsPage.tsx:9–10, DaysOffPage.tsx:9–10 and FamilySettingsPage `NAME_MAX`.
  - apps/web/test/helpers/fake-api.ts and schedule-fixtures.ts are typed only against those hand-written types.
- **Why it matters.** If the API renames a field or tightens a limit, the web keeps compiling and the web tests stay green, because the fake
  API returns the old shape. You only find out by hand-testing in the browser. Each new entity (overrides, log entries) doubles the
  surface.
- **Fix, cheap version (now).** Move the `*Json` types and the limit constants into `packages/contracts` (or into `@hh/engine/contracts` if a
  new package feels heavy), and have both apps import them with type-only imports or plain `as const` objects. Zod and runtime code stay in the API.
- **Fix, later.** Add one API test that writes real responses to JSON fixtures, and have the fake API load those.
- **Effort:** M.

**M-3. The web depends on the format of the server's error messages.** Areas: DIP and DRY.
- **Where.** formBits.tsx:27 (`err.message.replace(/^[a-zA-Z.]+: /, "")`). The same function is copied as `messageFor` in
  features/roster/RosterPage.tsx:33–40.
- **Why it matters.** The "field: message" text from `parseBody` has quietly become part of the API. Any change to the wording breaks the UI's
  messages, and nothing tests the coupling. Because the API never says which field failed, a server-side error can't be shown next to that field either.
- **Fix.** Make `parseBody` return `{ error, message, field }`, where `field` is the zod issue path joined with "." and `message` has no prefix. The web then
  shows `message`, and `field` can be used for the field-level `aria-describedby`. Delete `messageFor` and keep the one `saveError`.
- **Effort:** S.

**M-4. Repo SQL is copy-pasted, and the next sprint will copy it again.** Areas: OCP and DRY.
- **Where.**
  - The dynamic `SET` builder appears four times: rosterRepo.ts:74, assignmentRepo.ts:102, eventRepo.ts:118 and blockedRangeRepo.ts:81.
  - `setChildren` appears three times: assignmentRepo.ts:76–80, eventRepo.ts:85 and blockedRangeRepo.ts:64. The assignment copy has no empty-array guard, unlike the others.
  - The `lock*`/`get*` pair appears three times: assignmentRepo.ts:96, eventRepo.ts:80 and blockedRangeRepo.ts:59.
- **Why it matters.** Week overrides and log entries add at least two more repos of the same shape. Each copy is one more place where a
  `family_id` predicate can be forgotten. The schema FKs would still stop cross-family links, but not cross-family *reads*.
- **Fix.** Add two small functions in `repos/sql.ts`:
  - `updateColumns(db, table, { id, familyId }, patch, columnMap)` builds `SET col = $n …` and always appends `AND family_id = $k`.
  - `replaceLinks(db, table, ownerCol, ownerId, familyId, childIds)` handles the empty guard.
  Test them once and keep the repos as thin, explicit SQL. **Don't** build a generic repository class or adopt an ORM (see the over-engineering notes).
- **Effort:** S.

**M-5. Validation policy differs from route to route.** Area: consistency and best practice.
- **Where.**
  - **Unknown keys.** The family PATCH body is `.strict()` (routes/family.ts:25–27), while every other body strips unknown keys. So
    `{ title: "x", titel: "y" }` on an assignment silently drops the typo, but the same mistake on family returns 400.
  - **List query.** `ListQuery` is redefined in children.ts:7, assignments.ts:11, events.ts:11 and subjects. `includeArchived=yes` is silently
    treated as false (children.ts:19).
  - **Weekday schema.** `SchoolDays` (family.ts:17) duplicates `Weekdays` (scheduleLimits.ts:52).
  - **NUL check.** The NUL-character refine is repeated in http/validate.ts:5 (`Name`), scheduleLimits.ts:60 (`Title`), events.ts:15 and blockedRanges.ts:14.
  - **Magic number.** `IdList(20)` (events.ts:53, blockedRanges.ts:19) versus the named `MAX_ASSIGNMENT_CHILDREN` (assignments.ts:14).
  - **Enums.** `Unit` (assignments.ts:13) and `Rule` (events.ts:17) restate the engine's unions and the DB CHECKs (001_init.sql:68, 107, 130).
- **Why it matters.** Each new route has to choose its own policy, and tests have to probe every route separately (tester rounds 1–2 did exactly that).
  An enum value added in the engine won't be accepted by the API until someone remembers.
- **Fix.**
  - Choose **strict everywhere**, because typos become 400s. It's a tiny change, and the web only sends known keys.
  - Add shared primitives in http/validate.ts: `ListQuery` (a boolean that rejects anything other than true/false), `Weekdays`, `Text(max)` with the NUL check, and `ChildIds` built from one `MAX_CHILDREN_PER_ITEM`.
  - Export `UNIT_TYPES` and `EVENT_RULES` `as const` arrays from the engine and use `z.enum(UNIT_TYPES)`.
- **Effort:** S.

**M-6. `minutesPerUnit` is accepted and stored, but ignored for `unitType: "minutes"`.** Area: validation. It is also an LSP-style surprise: the same field
  means different things depending on the unit.
- **Where.** The API accepts it at assignments.ts:23 and 36. The engine forces it to 1 at packages/engine/src/units.ts:11.
- **Why it matters.** A user or client sends `{ unitType: "minutes", minutesPerUnit: 30 }`. It is saved and returned, but the plan uses 1. The data and the
  behaviour disagree, and the logging sprint ("minutes spent" versus units) will build on the stored value.
- **Fix.** Pick one of these and test it on both POST and PATCH, including a PATCH that changes `unitType` to minutes:
  - in the zod refine, reject with 400 when `unitType === "minutes"` and `minutesPerUnit` is not null or 1, or
  - normalise it to null on write.
- **Effort:** S.

**M-7. The API has a hidden clock, which blocks testing "today".** Area: testability (DIP).
- **Where.** routes/plan.ts:57 calls `localToday(zone)` with the real clock. `localToday` itself is injectable, but nothing passes a clock in.
  My own test works around it with a ±5 s window (apps/api/test/tester2.schedule.test.ts:381–384).
- **Why it matters.** The logging sprint will need "today" in more places: default log dates, "done today" and overdue. Without a seam, every such
  test either brackets time or is flaky around midnight in some zone.
- **Fix.** Add `BuildOptions.now?: () => Date`, decorated as `app.now` and defaulting to `() => new Date()`, and use it everywhere the API needs "today".
  Then replace the window in tester2.schedule.test.ts:381 with a fixed instant. SQL `now()` for session expiry can stay as it is.
- **Effort:** S.

**M-8. Which week the web shows depends on the device's time zone, but the server plans in the family's zone.** Area: correctness, plus a seam for logging.
- **Where.** PlanDebugView.tsx:15 (`deviceToday` uses the device's local fields) is used at :39 to pick the week. The server's default `asOf` uses
  the family's `time_zone` (routes/plan.ts:57).
- **Why it matters.** A parent who is travelling, or whose tablet is set to UTC, sees a different "this week" from the one the plan treats as today. This is a small
  issue on the debug view, but it becomes a real bug once "log today's work" exists.
- **Fix.** Have `/api/me` return `today` (server-computed in the family zone using `app.now`). The web uses `me.today`, and `deviceToday` remains only as
  an offline fallback.
- **Effort:** S.

**M-9. Large components and functions mix several jobs.** Area: SRP and testability.
- **Where.**
  - `planChild` in packages/engine/src/plan.ts:61–248 (about 190 lines: capacity, overrides, progress, two distribution modes and warnings).
  - `EventForm` in EventsPage.tsx:87–255 (state, client validation, PATCH diffing and rendering).
  - The PATCH-diff logic is written five times: AssignmentsPage.tsx:107–114, EventsPage.tsx:152–164, DaysOffPage.tsx:87–91,
    FamilySettingsPage.tsx:74–78 and RosterPage.tsx:92–93. Each copy uses a different comparison: `sameSet`, `join()`, or an epsilon at EventsPage.tsx:157.
- **Why it matters.** The diff and validation rules can only be tested by rendering and typing. A missing field in one copy means a silent no-op
  save. The engine is well covered by tests, but every override or timeline change has to be made inside the one big function.
- **Fix.**
  - **Web.** Add a pure `diffPatch(item, next, { sets: [...], approx: [...] })` in formBits plus pure `validateX(fields)` functions, and unit-test them
    without React. The forms then only render.
  - **Engine.** Extract `applyOverrides`, `distributeKeepEndDate` and `distributePushEndDate` as plain functions when you next touch
    overrides. Use plain functions, not Strategy classes (see L-8).
- **Effort:** M. Do the web part when the forms are next touched, and the engine part with the overrides sprint.

### Low

**L-1. `HttpError` lives in app.ts, so there is a circular import.** Area: DIP.
- **Where.** app.ts:27, imported back by routes/*.ts:7, while app.ts imports the routes.
- **Why it matters.** It works today only because routes call `new HttpError` lazily. A future top-level `const E = new HttpError(...)` in a route
  would crash with a TDZ error at startup.
- **Fix.** Move it to `http/errors.ts`.
- **Effort:** S.

**L-2. pg type parsers are set globally as an import side effect.** Area: hidden dependency.
- **Where.** db.ts:6 and 8.
- **Why it matters.** Any code that imports db.ts changes the behaviour of *every* pg client in the process. NUMERIC→Number is fine for numeric(10,2) and (4,3), but it
  will silently lose precision if a money or large numeric column is ever added.
- **Fix.** Pass `types` in the Pool options, or keep the global setting but add a comment and a test asserting the column precisions.
- **Effort:** S.

**L-3. The session check runs after the body is parsed, and its 401 body has a different shape.** Area: best practice and consistency.
- **Where.** auth/session.ts:43 (`preHandler`); the 401 responses at :47 and :53 have no `message`.
- **Why it matters.** Unauthenticated requests still have their bodies parsed (up to 1 MB). The 401 shape differs from `HttpError`'s `{ error, message }`.
- **Fix.** Use the `onRequest` hook (`routeOptions` is available there in Fastify 5) and send `{ error, message }`.
- **Effort:** S.

**L-4. The "family gone" handling is duplicated, and one error is unmapped.** Area: DRY and error handling.
- **Where.** The "Your family no longer exists." 401 is copied at me.ts:15, plan.ts:55 and family.ts:30. `FamilyNotFoundError`
  (plan/loadPlanInputs.ts:24) isn't mapped by the error handler, so it would become a 500. That path is effectively unreachable today, because deleting a family
  cascades to its sessions.
- **Fix.** Add a `familyGone()` helper, and map `FamilyNotFoundError` to that 401 in the error handler.
- **Effort:** S.

**L-5. The roster repo picks transactional behaviour by duck typing.** Area: LSP.
- **Where.** rosterRepo.ts:9 (`isPool`).
- **Why it matters.** Passing a pool or a client, both valid `Queryable`s, gives different transactional semantics. The behaviour depends on which subtype you pass.
- **Fix.** Take the transaction decision away from the repo: the route always wraps the call in `withTransaction`, and the function takes a `PoolClient`.
- **Effort:** S.

**L-6. The ref check guesses the field name.** Area: fragility.
- **Where.** http/refs.ts:19 infers the field name from `subjectIds.length === 1`.
- **Why it matters.** A future caller that checks a single subject in a list will get the wrong field in the error.
- **Fix.** Pass the field name explicitly.
- **Effort:** S.

**L-7. The engine filters progress and overrides inside the per-child loop.** Area: performance (later).
- **Where.** packages/engine/src/plan.ts:37 and 75, which makes the work O(assignments × children × entries).
- **Why it matters.** It's trivial at pilot scale. Once logging adds thousands of entries a year it's still small, but it's an easy fix.
- **Fix.** Group entries by `assignmentId|childId` once in `planAll`.
- **Effort:** S. Defer until logging.

**L-8. The mode switch in the engine is an if/else.** Area: OCP, though acceptable.
- **Where.** packages/engine/src/plan.ts:162.
- **Assessment.** With two modes, an if/else is the simplest correct code. Extract functions (M-9) and switch to a `Record<Mode, fn>` only if a third mode
  appears. Don't introduce Strategy classes.

**L-9. `useApi` has no abort, and the client uses a module-level singleton.** Area: testability.
- **Where.** api/useApi.ts relies only on a ticket guard. api/client.ts:14 holds the `unauthenticatedHandler` singleton.
- **Why it matters.** The stale-ticket guard keeps state correct, but requests that are no longer needed keep running and resolve after a test ends. The overnight
  test race was of this kind. The singleton has to be reset between tests.
- **Fix.** Use an `AbortController` in the effect cleanup and pass `signal` through `request`. Optionally, provide the handler through React context instead of
  the module variable.
- **Effort:** S.

**L-10. Row lookup builds a CSS selector from the id.** Area: robustness.
- **Where.** ScheduleList.tsx:66 and RosterPage.tsx:74 interpolate the id into a selector string.
- **Why it matters.** It's safe because ids are UUIDs, but it breaks for any id with quotes and it reads the global `document`.
- **Fix.** Use `CSS.escape(id)`, or keep a `Map<id, HTMLElement>` of refs.
- **Effort:** S.

**L-11. RosterPage re-implements ScheduleList.** Area: DRY and SRP.
- **Where.** features/roster/RosterPage.tsx (about 230 lines) repeats the list, add/edit, archive, focus-restore and error-message logic that the generic
  ScheduleList<T> already has.
- **Why it matters.** Fixes such as focus handling and error text have to be made twice.
- **Fix.** Move the roster onto ScheduleList the next time either is touched, or extract a shared `useListEditing` hook.
- **Effort:** M. Defer.

**L-12. ScheduleList has a `removal` mode flag.** Area: OCP and ISP, minor.
- **Where.** ScheduleList.tsx:37 and 86 (`"archive" | "delete"`).
- **Assessment.** Fine with two values. If a third behaviour shows up, take an `onRemove` render prop instead of adding a third flag.

**L-13. Lint isn't type-aware.** Area: best practice.
- **Where.** eslint.config uses `tseslint.configs.recommended`, so `no-floating-promises` and `no-misused-promises` aren't enabled.
- **Why it matters.** An un-awaited `reload()` or an async `onClick` won't be flagged.
- **Fix.** Turn on just those two rules with `parserOptions.projectService`.
- **Effort:** S–M (lint time goes up).

**L-14. Join tables have no `family_id` index.** Area: DB.
- **Where.** `assignment_child`, `event_child`, `event_subject_rule` and `blocked_range_child` are read with `WHERE family_id = $1` in
  loadPlanInputs, but they only have PKs and child indexes (001_init.sql:85–93, 116–135, 152–159).
- **Why it matters.** Those reads are sequential scans. That's fine at pilot scale.
- **Fix.** Add `(family_id)` indexes in the next migration.
- **Effort:** S.

**L-15. Expired sessions are never cleaned up.** Area: DB hygiene.
- **Where.** Rows are deleted only on logout (routes/auth.ts:40).
- **Fix.** Run `DELETE FROM session WHERE expires_at < now()` opportunistically on login.
- **Effort:** S.

**L-16. Test design has some loose ends.** Areas: test design and DRY.
- **Silent skips.** Integration tests skip silently when `DATABASE_URL` isn't a `_test` URL (test/helpers/db.ts:5; 33 `describe.skipIf`). CI sets the URL
  (ci.yml:27), but a local `npm test` without it goes green with most API coverage skipped. Fix: print a loud warning in a globalSetup, or fail unless
  `SKIP_DB=1`.
- **Fixture duplication.** Fixture inserts are copied (children-list.test.ts:17–21 and subjects-list.test.ts:17–21), and there are two family factories
  (helpers/session.ts:6 and helpers/family.ts:8). Fold them into helpers/seed.ts.
- **My own files.** The tester files are grouped by author (tester.*, tester2.*) rather than by feature. Fold them into the feature files when those files are next edited, so
  coverage for a route lives in one place.
- **Effort:** S.

**L-17. `CURRENT_NAME` alias map.** Area: over-engineering and maintenance.
- **Where.** http/timeZone.ts:21–41.
- **Assessment.** It's justified by S2a-17 (canonical names), but it is a hand-maintained copy of tzdata history. Keep it small, add a test that every
  alias target is in `Intl.supportedValuesOf("timeZone")`, and don't extend it speculatively.
- **Effort:** S.

---

## Seams for the next sprints

- **Week overrides.** The schema (001_init.sql:164–181), the engine and the loader (loadPlanInputs.ts:77) are ready. Only a repo and a route are missing.
  Build them on the M-4 helpers and the M-5 primitives, so this becomes the first entity that *doesn't* copy SQL.
- **Logging.** It needs M-7 and M-8 (one server-side "today"), M-1 (snapshot reads while writes happen) and H-1 (pilot visibility). The
  `log_entry`/`log_child_progress` design is good: its composite FK and one-checkoff unique index (001_init.sql:185–220) push the rules down into the DB.
  Write log entries and their progress in one `withTransaction`.
- **Timeline.** routes/plan.ts:61 computes the full plan and then filters to the requested range. That's fine for now. Only consider caching per family (keyed by
  a data version) if timeline queries get slow; don't build it ahead of need.

## Over-engineering risks (advice: don't)

- No DI container, generic `Repository<T>`, ORM, or CQRS layer. Plain functions that take `Queryable`/`now` already give the seams the tests need.
- No Strategy classes in the engine for two modes (L-8).
- No shared runtime zod package between web and API yet. Types plus constants (M-2) cover the drift risk for a fraction of the effort.
- Don't grow the time-zone alias map beyond what tests prove is needed (L-17).

---

## Top 5 to do now vs. defer

**Do now.** All five are effort S, about half a day in total, and each one unblocks or de-risks the pilot or the next sprint:
1. **H-1: turn on production logging** with redaction, and log pool errors.
2. **M-1: run `loadPlanInputs` on one read-only REPEATABLE READ transaction.** That gives one connection and one snapshot.
3. **M-7 + M-8: one clock.** Add `BuildOptions.now`, have `/api/me` return `today`, and have the web use it. Then fix the time-window test.
4. **M-5 + M-6: one validation policy.** Strict bodies everywhere, shared `ListQuery`/`Weekdays`/`Text`/`ChildIds`, enums from
   the engine, and reject or normalise `minutesPerUnit` for minutes.
5. **M-4: the `updateColumns` and `replaceLinks` repo helpers,** written before the week-override and log repos get copied from the existing ones.

**Defer, in order:**
- **M-2** contracts package. It's the biggest drift risk, so do it at the start of the logging sprint.
- **M-3** the `field` in error bodies (pairs well with M-5 if there's time).
- **M-9** `diffPatch` and the `planChild` split. Do them when those files are next touched.
- **L-11** RosterPage onto ScheduleList.
- **L-1–L-17** as they come up. L-1, L-4 and L-16's loud skip warning are five-minute fixes worth bundling with any commit to the same files.
