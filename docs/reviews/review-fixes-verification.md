# Review-fix verification (RF-01 to RF-12)

*Verifier:* the tester. *Date:* Oct 28, 2026, 7:56–8:05 AM CT.
*Code verified:* `ee26b9a..24172fc` on `main` (RF-01 to RF-12).
*Checked against:* [tester review](tester-review.md), [developer review](developer-review.md) and [the tickets](../tickets/review-fixes/README.md).

This was a read-only pass on product code; nothing in `apps/`, `packages/` or `db/` was changed. No new test files were added, because everything below is either already covered by the developer's new tests or was checked by hand. Hand tests ran against my own API process (`NODE_ENV=production`, port 3911) and a scratch database (`hh_rfverify_test`). Both were removed afterwards. The other agents' servers on :3000 and :5173 were left alone.

## Verdict

**Pass.** All 12 tickets resolve their findings. Nothing regressed, there are no new high or medium issues, and 7 new low issues are listed below. Neither the gate nor the API suite flaked in normal order.

| Ticket | Review refs | Verdict | Evidence |
|---|---|---|---|
| RF-01 Gate and smoke scripts in the repo | dev M10 | Pass | `scripts/check.sh` and `scripts/smoke/` are in the repo. The gate ran green 3 times from the repo copy. |
| RF-02 build and db:validate in CI | dev M10 | Pass | `ci.yml` now runs lint, typecheck, build, db:reset, test, test:tz and db:validate, the same steps as `check.sh`. CI was reported green on the push. |
| RF-03 HttpError out of app.ts | dev M8, tester L-1 | Pass | It lives in `http/errors.ts`, and nothing imports `app.ts` for it any more, so the import cycle is gone. |
| RF-04 Production logging | tester H-1, dev M1 | Pass | See the hand test below. Production logs at `info` as JSON, one line per request and one per response. A 500 is logged at level 50 with the stack, and the client sees only the generic body. A grep of the whole log found no password, session token, `hh_session`, cookie, set-cookie, authorization, email or Bearer value. `LOG_LEVEL` is validated and defaults by `NODE_ENV`. Pool idle errors are logged, and a throwing logger can't crash the process. |
| RF-05 Plan inputs from one snapshot | tester M-1, dev M2 | Pass | `withReadSnapshot` runs every read on one client under `BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ`, one query at a time, and always releases the client. A missing family maps to 401. |
| RF-06 One injected clock | tester M-7, dev L3 | Pass | `systemClock` in `http/today.ts` is the only `new Date()` in `apps/api/src`. `buildApp({ now })` lets tests fix the clock. The plan's `asOf` default is the family's local date. |
| RF-07 Family's today to the web | tester M-8 | Pass | See the hand test below. `/api/me` `today` and the default plan `asOf` both follow the family's zone, not the server's or the device's. The web uses `me.today` and only falls back to the device date when it is missing. |
| RF-08 Enum constants in the engine | dev M4 | Pass, one leftover (L-N3) | The engine's `enums.ts` is now the one source. The zod enums, web types and labels derive from it, and `db/test/enums.test.ts` fails if a CHECK list drifts. |
| RF-09 Strict bodies | tester M-5 | Pass, with notes (L-N1, L-N2, L-N4) | See the hand test below. Every body schema rejects an unknown key with a 400 naming it, login included. `includeArchived` accepts only `true` or `false`. |
| RF-10 No minutesPerUnit on minutes | tester M-6 | Pass | See the hand tests below. The API checks the merged row, and migration 003 cleans up old data and then enforces the rule. |
| RF-11 Transaction-only type | dev M3, tester L-5 | Pass | Every locking or multi-statement repo function now takes the branded `Tx`, and `isPool` is gone. `tx-type.test.ts` has 9 `@ts-expect-error` lines and runs under `typecheck`. The "nothing written" checks are scoped per family, and only one global count is left (`> 0`, which is safe). |
| RF-12 Shared update and link SQL | dev M6, tester M-4 | Pass, one note (L-N5) | `buildUpdateSet` skips `undefined`, writes `null`, guards identifiers with a regex and always sets `updated_at`, so the SET list is never empty. `replaceLinks` deletes the old links by owner and family, and skips the insert for `[]`. Both have unit tests in `sql.test.ts`. |

## Flake result

| Run | What | Result |
|---|---|---|
| 3× `bash scripts/check.sh` (7:57–8:03 AM CT) | the full gate | Exit 0 every time, with identical counts each run: engine 159 (13 files, ×8 zones), API 546 (38 files), web 139 (21 files), db 25 (5 files). |
| 11× API suite alone (`vitest run --root apps/api`) | default order | 11 of 11 green, 546 of 546. |
| 5× API suite with `--sequence.shuffle` | tests reordered inside each file | 5 of 5 failed, 9–13 tests each. This order dependence was already there before these fixes (see L-N7). |

**Conclusion:** there are no flakes in the order CI and `check.sh` actually use, 14 of 14 runs green. The global session and row counts that could collide between test files running in parallel were removed in RF-11.

## Hand tests (production mode, my own API process and database)

- **Strict bodies (RF-09):**
  - Each of these returns 400 `invalid_request` with a message naming the extra key:
    - `POST /api/auth/login` with `remember`
    - `POST /api/children` with `family_id`
    - `POST /api/subjects` with `colour`
    - `PATCH /api/family` with `bogus`
  - A login with only the known keys and a wrong password still gets 401.
- **includeArchived (RF-09):**
  - After archiving a child:
    - no param → only active children
    - `=false` → only active children
    - `=true` → the archived child too
  - Each of these returns 400:
    - `=yes`, `=1`, `=TRUE`, `=` (empty)
    - the param repeated (`=true&includeArchived=false`)
    - `?foo=bar`
  - `/assignments` and `/events` accept it as well.
- **minutesPerUnit (RF-10):**
  - POST:
    - minutes with `20` → 400 "doesn't apply to minutes"
    - minutes with `null` or the key left out → 201 with null
  - PATCH on a pages row that has `minutesPerUnit: 5`:
    - `{unitType:"minutes"}` → 400 "send minutesPerUnit: null when switching to minutes"
    - the same with `null` → 200
    - then `{minutesPerUnit:7}` → 400
    - switching back to lessons with 15 → 200
    - `0` → 400
- **Migration 003 (RF-10):**
  - I migrated through 002, then seeded one minutes row with 30 and one pages row with 4.
  - Migrating 003 cleared the minutes row to null and kept the pages row's 4.
  - Running it again applied nothing.
  - An `UPDATE` that sets `minutes_per_unit` on a minutes row is rejected by the CHECK (`23514`).
- **Family today (RF-06 and RF-07):** at 12:58 UTC on Oct 28:

  | Family zone | `/api/me` today | `/api/plan` asOf |
  |---|---|---|
  | Pacific/Kiritimati | 2026-10-29 | 2026-10-29 |
  | Pacific/Pago_Pago | 2026-10-28 | 2026-10-28 |
  | America/Chicago | 2026-10-28 | 2026-10-28 |

  This is correct: Pago Pago is 01:58 on Oct 28. `me.test.ts` and `tester2.schedule.test.ts` already cover both edge zones with a fixed clock.
- **Logging (RF-04):**
  - I logged in once with a wrong password, once with the real one, then made authenticated calls.
  - I sent an `authorization: Bearer …` header on a request that forced a 500, by renaming the `child` table in my scratch database.
  - That request was logged once at level 50 with `err.type`, `message`, `stack` and `code` 42P01.
  - The response was `{"error":"internal_error","message":"Something went wrong."}`.
  - Request lines contain only `{method,url,route,ip}`, and response lines only `{statusCode}`.
  - No secret appeared anywhere in the 125-line log.

## New findings

There are no new high or medium findings. All of the low ones below are polish; none blocks the pilot.

- **L-N1: list query strictness is uneven.** RF-09 made `?foo=bar` a 400 on children, subjects, assignments and events, but these still return 200 and ignore it:
  - `GET /api/blocked-ranges?foo=bar` (the route never reads its query)
  - `GET /api/me?foo=bar`
  - `GET /api/plan?from=…&to=…&foo=bar` (`dayParam` reads only the known keys)

  **Suggestion:** decide on one policy. Either use a strict empty query schema on blocked-ranges and me plus a strict `PlanQuery`, or document that only `includeArchived` lists are strict.
- **L-N2: stale comments.** `routes/assignments.ts:17`, `routes/children.ts:8` and `routes/subjects.ts:9` still say "Unknown keys (e.g. family_id) are dropped". Since RF-09, those keys are rejected.
- **L-N3: RF-08 leftovers.** `routes/me.ts:5,7` and `routes/family.ts:12,13` still spell out `"mon" | "sun"` by hand, rather than using `WeekStart` from the engine.
- **L-N4: another hand-synced copy.** `BODY_KEYS` in `apps/web/test/helpers/fake-api.ts` repeats the API's body schemas. It catches the web sending unknown keys, which is good, but it can drift from the real API. This is part of the deferred contract finding (tester M-2), so I'm only noting it.
- **L-N5: `buildUpdateSet` parameter coupling.** Callers have to pass `firstParam: 3` and also spread `[id, familyId, ...params]` in the same order, and the `WHERE id = $1 AND family_id = $2` predicate is still written in 4 places. It is correct today and covered by tests. Building the predicate inside the helper, or numbering the parameters there, would remove the pairing.
- **L-N6: `me.today` can go stale.** `AuthProvider` loads `/api/me` only on sign-in and after a settings change, so a Plan tab left open past local midnight keeps yesterday's default week until it is reloaded. Refreshing on window focus, or when the date changes, would fix it.
- **L-N7: some API tests depend on their order within a file.** This predates the fixes: the failing lines date from Sprint 1 and 2a, e.g. `children-create.test.ts:28` (from `b23b1db`) expects `sortOrder: 0`. Tests within a file share one family and build on earlier steps, as do `plan-contract.test.ts` stages 1–4 and the archive and rename tests. They pass in the default order every time, but `--sequence.shuffle` fails 9–13 of them. **Suggestion:** use a fresh family per test, or mark the staged files with `describe.sequential` and a comment.
- **Note, not a finding:** for a database error, the 500 log includes pg's whole error object. A constraint error's `detail` can carry a value, such as `Key (login_email)=(…)`. The mapped constraint errors (duplicate name → 409) never reach that path, so this is acceptable for the pilot. Serialize `err` without `detail` if that changes.

## Developer and tester findings: status

- **Closed by these tickets:**
  - tester H-1, M-1, M-4, M-5, M-6, M-7, M-8 and L-1, L-5
  - developer M1, M2, M3, M4, M6, M8, M10 and L3
- **Still deferred, as the tickets say:** tester M-2, M-3 and M-9, and the remaining low items.
