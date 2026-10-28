# Review fixes: the agreed "do now" items

Source: [developer review](../../reviews/developer-review.md) and [tester review](../../reviews/tester-review.md).
The tester's do-now list (H-1, M-1, M-7 + M-8, M-5 + M-6, M-4) plus the developer's top five (M1 logging, M2 plan snapshot, M3 Tx type, M4 enums, M10 gate in the repo and CI) and the cheap ones (dev M8 / tester L-1 `HttpError`).

Same format and rules as the sprints: one ticket per commit, and the full gate is green before each commit (lint, typecheck, build, test, test:tz, db validate; `scripts/check.sh` after RF-01).
**No behavior change users would notice**, except stricter validation (RF-09, RF-10). Per the tester: no DI container, ORM or Strategy classes; plain functions and one injected clock.

### Order and dependencies

| # | Ticket | Review refs | Depends on | Size |
|---|---|---|---|---|
| RF-01 | [Move the gate and smoke scripts into the repo](RF-01-move-the-gate-and-smoke-scripts-into-the-repo.md) | dev M10 | none | XS |
| RF-02 | [Run build and validate.sql in CI](RF-02-run-build-and-validate-sql-in-ci.md) | dev M10 | RF-01 | XS |
| RF-03 | [Move HttpError out of app.ts](RF-03-move-httperror-out-of-app-ts.md) | dev M8, tester L-1 | none | XS |
| RF-04 | [Turn on structured production logging](RF-04-turn-on-structured-production-logging.md) | dev M1, tester H-1 | RF-03 | S |
| RF-05 | [Load plan inputs from one snapshot](RF-05-load-plan-inputs-from-one-snapshot.md) | dev M2, tester M-1 | none | S |
| RF-06 | [Inject one clock into the API](RF-06-inject-one-clock-into-the-api.md) | tester M-7, dev L3 | RF-04 | S |
| RF-07 | [Serve the family's today to the web](RF-07-serve-the-familys-today-to-the-web.md) | tester M-8 | RF-06 | S |
| RF-08 | [Share enum constants from the engine](RF-08-share-enum-constants-from-the-engine.md) | dev M4 | none | S |
| RF-09 | [Reject unknown body fields everywhere](RF-09-reject-unknown-body-fields-everywhere.md) | tester M-5 | RF-08 | S |
| RF-10 | [Reject minutesPerUnit on minutes assignments](RF-10-reject-minutesperunit-on-minutes-assignments.md) | tester M-6 | RF-09 | S |
| RF-11 | [Add a transaction-only type](RF-11-add-a-transaction-only-type.md) | dev M3, tester L-5 | RF-05 | S |
| RF-12 | [Share the update and link-replace SQL](RF-12-share-the-update-and-link-replace-sql.md) | dev M6, tester M-4 | RF-11 | S |

### Tracks
- **Gate:** RF-01 → RF-02 (first, so every later ticket runs the in-repo gate).
- **Observability and time:** RF-03 → RF-04 → RF-06 → RF-07.
- **Plan reads:** RF-05.
- **Validation:** RF-08 → RF-09 → RF-10.
- **Repos:** RF-05 → RF-11 → RF-12.

### Implementation order used
RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12 (table order).

### Not in this set (later, per the reviews)
Everything else in both reviews' "later" lists: e.g. splitting `plan.ts` in the engine, a generated API client, request ids in responses, the set-family-login transaction, session-hook messages.
