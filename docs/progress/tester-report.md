# Tester report: Sprint 1 (Oct 28, 2026, overnight, box only)

Independent pass over `main` by a tester who didn't write the code. Everything ran on the box against embedded Postgres 16.14 (`hh_test`; the `hh_dev` smoke family was removed afterwards). Nothing was pushed or sent.

**Gate at the end:** lint ✓, typecheck ✓, build ✓, `npm test` ✓ (engine 153, API 161, web 85, db 8 = 407; baseline was 346), `test:tz` ✓ (all 8 zones).

**Added tests (61):**

- `packages/engine/test/tester.adversarial.test.ts`: 25 tests, including a 600-case seeded fuzz.
- `apps/api/test/tester.security.test.ts`: 32 tests.
- `apps/api/test/tester.robustness.test.ts`: 3 tests.
- `apps/web/test/tester.layout.test.ts`: 1 test.

**Smoke:**

- Scenario: `docs/progress/tester-smoke/tester-odd.mjs`.
- Screens: `docs/progress/screens/tester-*-{360,1280}.png`.

## Bugs

| ID | Severity | What | Repro | Status |
|---|---|---|---|---|
| T-API-1 | Medium | A NUL character (`\u0000`) in a child or subject name (POST or PATCH), or in the login email, returned **500**. Postgres `text` rejects 0x00, so the error escaped as an internal error. | `POST /api/children {"name":"Ada\u0000"}` → 500 | **Fixed** 5641ffb. `Name` and the login email reject NUL with 400 `invalid_request`. Tests: `tester.security` › hostile input › NUL ×4. |
| T-API-2 | Medium | Concurrent creates tie on `sort_order`. `INSERT … SELECT MAX(sort_order)+1` has no lock, so 20 parallel POSTs got only 5–8 distinct values. The list then falls back to name order, so the "appended last" behaviour breaks. A double-tap on Save, or two parents on two phones, could hit this. | 20 × `POST /api/children` with `Promise.all` | **Fixed** bd0ffca. `rosterRepo.create` takes `pg_advisory_xact_lock(hashtextextended('<table>:<familyId>'))` in its own transaction before the INSERT reads MAX. Inside a caller's transaction it reuses that client. The test was stable over 3 reruns. |
| T-WEB-1 | Low | The plan debug view at 360 px: an active child with an unbroken 60-character name and nothing planned made the page **913 px wide** (horizontal scroll). The roster lists were fine because they truncate with an ellipsis. | 360 px viewport, child named `"W"×60` with no assignments, then open `/?week=2026-10-26` | **Fixed** 81d880b. Added `overflow-wrap: anywhere` on `.plan-debug-unplanned`. jsdom can't lay out, so the guard test checks the CSS rule; the smoke run is the real check. After the fix, scrollWidth is 360 at 360 and 1280 at 1280. |
| T-ENG-1 | Low | An event's `subjectRules[subjectId]` read Object.prototype members. A subject id of `constructor` or `toString` got a function, which was then treated as "normal" and overrode `defaultRule`. Real ids are UUIDs, so the practical impact is low. | event with `defaultRule:"skip"` and subject id `"constructor"` → minutes planned on the skip day | **Fixed** 955b8d0 (own-key lookup). |
| T-ENG-2 | Info | The engine's "never Infinity" claim fails for absurd inputs: `totalUnits` 1e306 × 999 min/unit gives Infinity minutes. The DB column limits (`numeric(10,2)`, `numeric(8,2)`) make this unreachable through the API. | `tester.adversarial` › `it.fails` "absurd units" | **Not fixed**, documented with `it.fails`. Clamp, or warn, if the engine is ever fed by anything other than the DB. |
| T-API-3 | Low | An invalid `family.time_zone` (the column is text with no CHECK) makes `localToday()` throw a RangeError, so every `GET /api/plan` without `asOf` returns **500**. No Sprint 1 route writes `time_zone`, so only a bad seed or a manual edit can cause it today. | `UPDATE family SET time_zone='Mars/Olympus_Mons'`, then `GET /api/plan?from=…&to=…` | **Not fixed**, documented with `it.fails` in `tester.robustness`. The fix belongs with the Sprint 2 family-settings ticket: validate the zone on write, and add a CHECK or fall back on read. |

**Process note:** my first engine commit (6c4a09b) left an unused import, so `npm run lint` was red for 6 of my commits until 1086a37. All tests stayed green throughout. Lint is clean at HEAD.

## Ticket audit (37 Sprint 1 tickets)

I checked every "Done when" box and every listed test against the code and tests. 31 tickets match fully. There are 6 mismatches, and none of them hides missing work.

| Ticket | Mismatch | Notes |
|---|---|---|
| S1-02 | Both boxes unticked: no PR has shown a passing CI check, and nobody has done the red/green check. | `.github/workflows/ci.yml` exists and looks right: PG16 service, lint, typecheck, db:reset, test, test:tz. Not verifiable from the box; it needs a push, which is out of scope here. |
| S1-04 | Both boxes unticked. Docker isn't on the box. | I ran `db/test/validate.cjs` against a **fresh scratch DB** on embedded PG 16.14: `ALL CHECKS PASSED`. The schema half is therefore true; the `docker compose up` half is still unverified. |
| S1-08 | The ticket says `db:reset` "refuses on any other DB name" than hh_dev. The code (and its test) allows any name ending in `_dev` **or `_test`**. CI depends on this (`npm run db:reset` on hh_test). | The behaviour is sensible; update the ticket wording. |
| S1-21 | The iPhone home-screen box is unticked. | It needs a real iPhone. |
| S1-12 / S1-06 | "Register @fastify/cookie with SESSION_SECRET": the secret is registered, but `hh_session` isn't a signed cookie, so the secret protects nothing yet. | Not a hole: the token is 256-bit random and only its SHA-256 is stored. Either sign the cookie or document that the secret is reserved. |
| S1-17 / S1-36 | "Looks right at 360 px" was false for long unbroken names in the plan view. | Fixed (T-WEB-1). |

Also checked and true:

- **Login (S1-12):** cookie flags (HttpOnly, SameSite=Lax, Path=/, Max-Age 30 d, Secure only in production); only the hash is stored; dummy-hash timing for unknown emails; the 11th login from one IP is a 429.
- **Session check (S1-13):** an expired session (1 s past expiry) is rejected.
- **Logout (S1-14):** after logout, the old cookie gets 401.
- **Cross-family access:** every list, PATCH (each field), `/api/me` and `/api/plan` (a `familyId` query parameter is ignored).
- **Name validation:** trimming, the 60-character limit, and colour validation.
- **Subject names (S1-29/30):** duplicates of any case or spacing get a 409, and unarchiving into a clash gets a 409.
- **Plan inputs (S1-34):** the mapping cases.
- **Plan route (S1-35):** 400-day bound, bad dates, no NaN.

## Security and robustness results (passing, no bug)

- **Cross-family isolation:**
  - No route leaks or edits another family's rows; a foreign id gets 404 and the row is untouched.
  - All 8 protected routes return 401 without a cookie.
  - Deleting a family kills its sessions.
- **Session fixation:**
  - A planted cookie is never honoured.
  - Login always mints a new 43-character base64url token.
  - Huge, unicode or injection-shaped cookie values get 401, never 500.
- **SQL injection strings** in names are stored and returned verbatim, because every query is parameterized and the table name is a closed union.
- **Unicode names round-trip unchanged:** emoji, ZWJ family emoji, RTL, combining marks and CJK, plus `"🦖"×30` (exactly 60 UTF-16 units).
- **Oversize, malformed and odd bodies:**
  - A 2 MB body gets 413 JSON.
  - Malformed JSON, `[]`, `null`, wrong types, text/plain and form-encoded bodies get 4xx.
  - `__proto__` and `constructor` keys get 400 from the strict schema, and nothing changes.
- **Login rate limit:**
  - The 11th attempt gets 429 `rate_limited`.
  - Other IPs are unaffected.
  - `X-Forwarded-For` can't dodge the limit, because trustProxy is off.
- **Concurrent creates of the same subject name:** exactly one 201 and nine 409s, never 500.
- **Archived-name edge cases:**
  - `"  aRT "` clashes with `Art`.
  - `ÄRT` doesn't clash with `Art`, but `ärt` clashes with `ÄRT`.
  - With two archived twins, the first unarchive is OK and the second gets 409.
  - Unarchive plus a rename in one PATCH succeeds.
  - Children may share names.
- **Engine:**
  - Over 600 fuzz plans: sane, units conserved, work only on capacity days, weekly invariant holds.
  - Deterministic, and inputs are not mutated.
  - Results don't depend on the order of events, blocks or progress.
  - Overrides are idempotent.
  - Sun- and Mon-start weeks, the year boundary and the 2028 leap day all work; 2027-02-29 and 2100-02-29 are rejected.
  - Overlapping events: lighter × lighter = 0.25, and skip wins.
  - 20 kids × 50 assignments.
- **Web at 360 and 1280 px with odd data:**
  - The test family had 20+ children: 60-character names, emoji, RTL, `<script>` and an SQLi-shaped name.
  - Names render literally (React escapes them).
  - Rows truncate with an ellipsis.
  - Adding a 30-emoji name through the form saves.
  - No console errors and no failed requests.
  - The only horizontal overflow was T-WEB-1.

## Untested risks

1. **Week-override mode order (S1-34 ↔ engine).** The engine takes the `mode` of the last applied override in *input order*, which `plan.ts` documents as "insertion order = edit order". `loadPlanInputs` sends overrides `ORDER BY week_start`, so with mixed modes the plan uses the latest *week's* mode, not the latest *edit's*. There is no write path until overrides ship, so it can't be observed yet. Decide the rule and order by `updated_at, id` if "last edit wins".
2. **Log on the asOf day.** It counts toward done, but that day shows the re-planned share of the remaining work, not the logged units. Check this against "progress fills the bars" before the logging UI ships.
3. **Name length counts UTF-16 units.** Both zod and the client count them, so the two agree, but 31 emoji or a few ZWJ family emoji fail the 60-character limit. Consider counting graphemes, or say "60 characters" carefully.
4. **Control characters other than NUL** (newline, tab, U+202E RTL override) are accepted in names. They aren't harmful in React, but they look odd and are spoofable in lists.
5. **Sessions are never revoked or cleaned up.** Login doesn't revoke a prior session (fine for multiple devices), expired rows are never deleted, and there's no per-email throttle (the rate limit is per IP only). `/api/plan` has no rate limit, and it runs 11 queries plus planning for up to 400 days.
6. **lower() collation.** Subject uniqueness uses `lower(btrim(name))`. It behaves correctly under `C.UTF-8` here, but a cluster with another collation or ctype could fold case differently (for example Turkish İ), which would change what counts as a duplicate.
7. **Push-mode overrides after E** are ignored with an `override-outside-range` warning, so a user override in the pushed tail would be dropped silently.
8. **Not verifiable on the box:** CI on GitHub (S1-02), docker compose (S1-04), the iPhone icon (S1-21), real mobile Safari layout, and screen readers (axe ran earlier).
9. The ZWJ family emoji renders as boxes in the box's Chrome. This is a font gap on the box, not the app.

## Recommended tickets

1. **Validate `family.time_zone`** on write, with a CHECK or fallback on read, so a bad zone can't cause a 500 (T-API-3). Do it with family settings in Sprint 2.
2. **Define the override mode rule** and order overrides by edit time in `loadPlanInputs` (risk 1).
3. **Session hygiene:**
   - a periodic delete of expired sessions;
   - a per-email login throttle;
   - sign the cookie, or drop the `SESSION_SECRET` requirement.
4. **Name policy:** count graphemes for the 60 limit, and reject C0 controls and bidi overrides in names.
5. **Engine guard:** clamp or warn on non-finite minutes (T-ENG-2), for non-DB callers.
6. **Update the S1-08 wording** (`_dev` or `_test`), and run the S1-02 red/green check on the first PR.

## Round 2 (Sprint 2a)

Independent tester pass on Sprint 2a (`3650efb..cecff2d`), run 03:58–04:10 CT on the box only. Nothing was pushed or sent.

### Counts

- **Tests added:** 33 API tests in `apps/api/test/tester2.schedule.test.ts`, plus one headless smoke scenario (`tester-smoke/tester2-odd.mjs` with seed `tester-smoke/tester2-seed-odd.mts`) run at 360 and 1280 px, giving 16 screens (`screens/tester2-*`).
- **Bugs:** 1 found and fixed (T2-1). 2 documented and not fixed (T2-2, T2-3).
- **Ticket audit:** 16 of 16 S2a tickets are ticked done. 1 wording mismatch (S2a-02). 3 tickets (S2a-14 to S2a-16) were not fully true until the T2-1 fix.
- **Commits:** `474e7b0` (tests, with T2-1 as `it.fails`), `b2d2384` (`fix(tester)`), and this report commit.
- **Gate:** green. Lint, typecheck, build, `npm test` (API 446, web 153, engine 132, db 8), `test:tz`, and `db validate` on a scratch database (ALL CHECKS PASSED).

### Bugs

| ID | Severity | What | Status |
|---|---|---|---|
| T2-1 | Medium (reachable in the UI) | Suppose a child was archived after being linked to an assignment, event or day off. Editing that item to add another child returned **400 invalid_reference**, because the PATCH re-checked every child sent and the form keeps the archived child ticked. The assignment PATCH also refused re-sending its own since-archived subject, which contradicts its own comment ("only newly named references are checked"). | **Fixed** in `b2d2384`. The three PATCH routes now check only newly named children (and the assignment's subject only when it changes). 4 tests, written first as `it.fails`. Re-verified in the smoke: all three edits now save. |
| T2-2 | Low (quirk) | `AMERICA/CHICAGO` is accepted, because the regex allows capitals and ICU is case-insensitive. It is stored exactly as sent. `america/chicago` is rejected. | Documented. The test pins the current behaviour. |
| T2-3 | Low (depends on the environment) | The Settings time-zone picker lists the **browser's** `Intl.supportedValuesOf("timeZone")`, but the API validates with **Node's** ICU (Node 20.19.2, tzdata 2024b). Chrome 156 offers 418 zones. All of them pass the API except **`America/Coyhaique`** (added in tzdata 2025b), so picking it gets a 400. All 417 of Node's own zones pass. | Not fixed. There is no minimal fix without upgrading Node/ICU or having the web build the list from the API. Recommended ticket below. |

### Ticket audit (S2a "Done when")

- **S2a-01 to S2a-11** (time-zone validation, family API, limits, assignments, blocked ranges, events, plan contract): verified by the developer's tests and this suite.
- **S2a-02 mismatch:** the ticket says the time-zone list comes from `Intl.supportedValuesOf`. The API deliberately uses a regex plus an ICU check instead. Only the web form (S2a-13) uses `supportedValuesOf`, which is the root of T2-3.
- **S2a-12** (Schedule nav, no overflow at 360/1280): verified in the smoke.
- **S2a-13** (Settings): verified in the smoke. It shows the stored `Asia/Kolkata` and lists 419 options.
- **S2a-14 to S2a-16** (Assignments, Days off, Events screens): an "edit" with an archived child still linked failed until T2-1 was fixed. Verified in the smoke after the fix.
- T-API-3 from round 1 was fixed by S2a-01 (the test was flipped by the developer).

### Security (cross-family)

There were no leaks on any of the 12 new route/method pairs:
- Lists from another family come back empty.
- PATCH or DELETE on a foreign id returns 404, upper-cased ids included.
- A foreign subject or child in any create or update returns `invalid_reference`.
- `family_id` in a body is ignored. The strict `PATCH /api/family` rejects it with a 400.
- Anonymous and expired sessions get 401.

### Validation

These all hold:
- **Dates:** years 2000–2100, leap days (2100-02-29 rejected), exact maximum spans (1096 days for assignments, 366 for blocked ranges), end < start (including merged PATCHes).
- **Children:** shared children are de-duplicated case-insensitively, capped at 20, and returned in roster order.
- **Numbers:** `1e309`, negatives and too many decimals are rejected.
- **Bodies and ids:** non-object bodies return 400, and malformed path ids return 404.
- **Event rules:** archived subject, duplicate key by case, 101 entries and `__proto__` are all rejected.
- **Time-zone aliases:** `US/Central`, `Asia/Kolkata`, `Europe/Kyiv` and `Etc/GMT-14` are accepted and stored as sent. `EST`, `GMT`, `CST6CDT`, `Zulu`, lowercase names, offsets and `Etc/GMT+15` are rejected. `asOf` handles the Kiritimati and Pago Pago extremes.

### Plan vs engine

`/api/plan` deep-equals `planAll` for a tricky family:
- 3 kids, 3 subjects and 5 assignments;
- 5 overlapping events (lighter on lighter, capacity 0, open start, default skip);
- 4 overlapping blocked ranges.

It still matches after archiving a subject and a child and deleting a duplicate range. The largest allowed assignment plans finitely.

### Concurrency

There were no 500s and no merged child or rule sets in any of these:
- 10 parallel `childIds` replacements;
- 10 parallel event-rule replacements;
- 8 parallel DELETEs (exactly one 204, seven 404);
- PATCH racing DELETE;
- 20 mixed creates.

Known minor race: archiving a child at the same moment it is linked can leave a link to an archived child. The plan ignores it and the UI can now edit it (T2-1).

### Web smoke (odd data, 360 and 1280 px)

The odd family had:
- Sunday week start and school days Sun/Tue/Thu/Sat, time zone `Asia/Kolkata`;
- 60-character family and child names, Arabic, emoji and `<b>` names;
- an archived child and an archived subject that are still linked;
- a 120-character event every day at capacity 0.001, with a rule for the archived subject;
- a 366-day vacation, duplicate overlapping sick days, and items dated 2100.

The run covered the Plan, the hub, Settings, the Assignments, Days off and Events lists, and three edits that add a child while an archived one stays ticked.

Result: **no horizontal overflow, no console errors, no HTTP ≥ 400, no failed requests or dialogs** at either width. `<b>Bold</b>` renders as text. The stale archived-subject rule is shown with its "kept unless you change the rules" note. The seeded family was deleted from `hh_dev` afterwards.

### Not tested / risks

- Real multi-process races: tests run against a single API process.
- DST edges for non-Chicago family zones beyond `asOf`.
- Screen readers on the long Event cards.

### Recommended tickets

1. **T2-3:** serve the supported zone list from the API (or filter the picker through the API's validator) so the browser and server agree.
2. **T2-2:** normalise or reject time-zone names that differ only in case.
3. Lock the archive-versus-link race with `SELECT … FOR SHARE` on referenced rows, if it ever matters.

## Round 3 (Sprint 2b weights): S2b-16 weight edge cases

Written by the developer as the tester ticket's suites (DeeDee's brief); a separate tester verifies afterwards.

**Suites:**
- `packages/engine/test/tester.weights.test.ts` (33): bad weights, a 100 × 100 000 plan, D1 scale, trimmed mean, D17, multi-child, no minute keys.
- `apps/api/test/tester3.weights.test.ts` (37): API 400s (raw JSON, so `-0` and `1.234` arrive as typed) for POST and PATCH, DB CHECKs, archived child, no history, trimmed mean through real saves, D17, multi-child, unit change, no minute keys in `/api/plan` or `/api/assignments`.
- `apps/web/test/tester3.weights.test.ts` (16): the form's weight field and the picker's Custom field reject the same values.
- `db/test/tester3.migration.test.ts` (2): 003 → 007 conversion and history backfill.

| Case | Where | Result |
|---|---|---|
| 1 Zero, negative, huge | engine `isValidWeight` + fallback; API POST/PATCH 400 with nothing written; DB CHECK 23514 (`0`, `-1`, `-0`, `0.001`, `100.01`), `1e308` → 22003; web both fields | Pass, with **T3-1** below. 100 × 100 000 units plans finitely (thickness 1e7 over 20 days). |
| 2 Scale (D1) | engine + `/api/plan` | Pass: 30 min of piano (built-in 0.5) and 15 pages at 1 are both thickness 15. |
| 3 Archived child | API | Pass: the suggestion uses their history, a create for them is 400 `invalid_reference`, unarchiving keeps the history. |
| 4 No history | API | Pass: built-ins 1/10/15/0.5; a save with no weight writes no history; the first explicit save does and the next suggestion uses it. The hint text for each source is covered by `weight-hint.test.tsx`. |
| 5 Trimmed mean | engine + API | Pass: 3 → mean, 4 → middle two, 5 with an outlier → trimmed, 6 → oldest out of the window; repeated edits count once; a clear drops the vote (and lets an older one back into the window). |
| 6 Learned units (D17) | engine + API + DB | Pass: lessons/minutes saves and edits write no history, the DB refuses such rows, lessons suggest the built-in; chapters learn. |
| 7 Multi-child | engine + API | Pass: one with history → theirs (the other listed without); both → median; saving 2.0 records both. The mixed hint text is in `weight-hint.test.tsx`. |
| 8 Unit change | API (+ `assignments-screen.test.tsx` for the web reset) | Pass: pages(2) → chapters alone 400 with history untouched, with 12 → 200 filed under chapters; → minutes with null → 200, no minutes history. |
| 9 Migration (D3) | db | Pass: 3 → 1.5, 4 → 2, 600 → 100 (clamped), 0 and NULL → NULL, 0.01 → 0.01, lessons 30 → 15, 2.5 → 1.25, minutes row NULL; only weighted pages/chapters became history; the column is gone. |
| 10 Logged hours | engine + API key walk | Pass: no key mentioning minutes. **Manual:** the only time text in the UI is the picker's preview caption ("20 pages a day ≈ 40 min of work"), which S2b-34/D22 asks for; it's derived from the weight, not from a plan's bars. The plan and cards show none (checked in the code: `features/plan` has no minute text). |

### Findings

| ID | Severity | What | Status |
|---|---|---|---|
| T3-1 | Info | The DB doesn't **reject** 3 decimals: `numeric(6,2)` rounds `1.234` to `1.23` before the CHECK sees it (and `0.001` rounds to `0.00`, which the CHECK then rejects). Only the API and web stop 3 decimals. | Not fixed; pinned by a test. Writes only come through the API. A `CHECK (weight_per_unit = round(weight_per_unit, 2))` can't help either, since the cast rounds first; rejecting would need the column as unconstrained `numeric`. |
| T3-2 | Info | The web parsers use `Number()`, so `"0x10"` or `"1e1"` would parse (16, 10). The `type="number"` input doesn't let those through in a browser. | Not fixed; noted. |

## Round 4 (Sprint 2b weights): S2b-37 subject defaults and precedence

Written by the developer as the tester ticket's suites (DeeDee's brief); a separate tester verifies afterwards.

**Suites:**
- `packages/engine/test/tester.subjects.test.ts` (22): plan and suggestion precedence per unit, lessons/minutes ignoring usual weights, live default, every unit mismatch pair, bad stored subject values, multi-child.
- `apps/api/test/tester4.subjects.test.ts` (17): the same through `/api/subjects`, `/api/assignments`, `/api/weights/suggestion` and `/api/plan`, plus the DB CHECKs.
- `apps/web/test/tester4.picker.test.ts` (18): every preset × unit planned through the engine.

| Case | Where | Result |
|---|---|---|
| 1 Precedence matrix | engine + API | Pass for pages and chapters: explicit → `assignment` even with history and a subject default; history + subject → the suggestion is the child's learned value (D19); subject only → `subject` (suggestion and plan); nothing → built-in (`default`). Lessons and minutes with history rows faked in the DB (the CHECK dropped in a rolled-back transaction) → the history is ignored: built-in, or the subject default when there is one. The plan never reads history. |
| 2 Live default (D20) | engine + API | Pass: a null-weight assignment follows a subject PATCH (2 → 3.5) on the next plan, and drops to the built-in when the default moves to another unit or is cleared. One that took the learned value (1.6) or an explicit one (4) stays put. |
| 3 Unit mismatch | engine (all 12 pairs) + API | Pass: Math's lessons-20 default leaves a Math pages assignment at 1 (`default`) and the pages suggestion at `builtin` (the response still reports `subjectDefault`); a Math lessons assignment gets 20. |
| 4 Bad values | API + DB | Pass: 0, -1, 101, 1.234, a missing or null unit, a string weight → 400 on create (nothing written) and PATCH (stored default unchanged). The DB CHECKs reject 0, -1, 101, a weight without a unit, a unit without a weight, and an unknown unit (23514). **T4-1** below. |
| 5 Archived subject | API | Pass, with the existing rule: while archived, its assignments aren't planned (Sprint 1), but `loadPlanInputs` still loads its default (S2b-33) and a suggestion with it returns it; unarchived, they plan at it (`subject`). |
| 6 Multi-child + subject | engine + API | Pass: neither child with history → the subject default, `source: "subject"`, both listed with `usual: null, choices: 0` (what the hint shows); the plan gives both children 2.5 `subject`. The hint text is in `weight-hint.test.tsx`. |
| 7 Picker | web (engine plan) | Pass: Light ½, Normal 1, Heavy 1½, Very heavy 2 × each unit's built-in; each round-trips through `presetFor` and plans at `units × built-in × multiplier`; None saves null and falls to the subject default or built-in. The rendered picker and its preview bar are in `thickness-picker.test.tsx`. |

### Findings

| ID | Severity | What | Status |
|---|---|---|---|
| T4-1 | Info | Like T3-1: `subject.default_weight` is `numeric(6,2)`, so the DB rounds `1.234` to `1.23` instead of rejecting it. The API rejects it. | Not fixed; pinned by a test. |

## Round 5 (Sprint 2b check-ins): S2b-28 check-in edge cases

Written by the developer as the tester ticket's suites (DeeDee's brief); a separate tester verifies afterwards.

**Suites:**
- `packages/engine/test/tester.checkins.test.ts` (16): plans on a 300-page, four-week fixture (75 a week).
- `apps/api/test/tester3.checkins.test.ts` (32): the same edges end to end on the sample family through `/api/check-ins`, `/api/plan`, `/api/children`, `/api/assignments` and `/api/blocked-ranges`, with clocks injected at Oct 27, 28 and 30 and Nov 4.
- Web: the existing `last-week-card`, `checkin-absorb` and `past-week-review` suites already cover the card side (hidden once skipped/reviewed, no question when finished, editing a skipped week), so no new web file.

| Case | Where | Result |
|---|---|---|
| 1 No logging | engine + API | Pass: Treasure Island is 90 pages the week of Oct 26 with the clock on Oct 27, 28 or 30, and every day's units are identical across them; inserting `log_entry` + `log_child_progress` rows changes no plan. |
| 2 Multi-child | engine + API | Pass in both modes: on History (shared), Margaret at the total is `finishedEarly` with no work after it, Frank's plan changes, and every other plan is byte-for-byte the same. Archiving Frank drops his plans and his rows in other weeks; the stored row stays in the DB and still shows (with its value) in the week it was entered, per S2b-23's "archived, unless checked in that week" rule. |
| 3 Finished early | engine + API | Pass: position = total → no units after it, `finishedEarly`, no item for it the next week; saving the week back to as planned restores the original days exactly. Reaching the total in the last planned week is on plan, not "early". |
| 4 Ahead | engine + API | Pass: keep and push both give an end earlier than or equal to before (keep: equal, thinner; push: earlier) and units + unplaced = the total. |
| 5 Vacation | engine + API | Pass: a fully blocked last week → `items: []`; a Wed–Sun block → the planned range equals the Mon–Tue units; behind + push across a future vacation week → no units in it and the end after it. |
| 6 Editing a past check-in | engine + API | Pass with a note: after week 1 → 65 (keep), week 2 → 140 (push), editing week 1 to 80 leaves week 2's anchor (140 at the end of week 2, the same 130 pages after it). The bars after week 2 are **not** identical, though: push keeps "the same pace", and that pace is the one week 1's check-in set (235/15 vs 220/15 a day on the engine fixture), so they differ slightly. With keep at week 2 they are identical. Clearing week 2 → only week 1's check-in applies, back to the original end. **T5-2** below. |
| 7 No planned work | engine + API | Pass: a week before any start, and the week after everything was checked in at its total → `items: []`. Reporting progress on a pair with nothing planned is refused by the API (400 `invalid_reference`, S2b-24), so `unplanned-progress` is reached end to end by storing a check-in and then blocking that week: the plan warns, keeps the stored position, and stays whole; the week still lists the row so it can be fixed. |
| 8 Skip | API | Pass: `planChanged: false`, the same plans, `status: "skipped"` on reload and from a second session; a later PUT with items re-reviews it. |
| 9 Bad input | API | Pass: -1, > total, 3 decimals, a string, null, 1e308, a missing or unknown mode, literal `NaN` (invalid JSON), the current and a future week, a mid-week date, an impossible date, another family's assignment or child → 400 and nothing stored. |
| 10 Total edited below a stored position | engine + API | **Failed, then fixed (T5-1):** the plan clamped with `checkin-clamped`, but `GET /api/check-ins` showed the raw stored 150 against a total of 120. |

### Findings

| ID | Severity | What | Status |
|---|---|---|---|
| T5-1 | Low | `GET /api/check-ins` returned a stored position above an edited-down total (150 of 120), so the card would show a position the plan doesn't use and its slider would sit past the end. | **Fixed** in the S2b-28 commit: `actual` is clamped to the current total in `weekView` (the row itself is kept, so raising the total again restores it). |
| T5-2 | Info (question) | Editing an earlier check-in still changes the bars after a later **push** check-in a little, because push keeps the pace the earlier one set. The later anchor and the work left are unchanged. Not changed: this matches the engine's documented push rule (`checkins.test.ts` uses keep twice for the same reason). If the intent is "a later check-in fully decides everything after it", push would need to take its pace from the original plan instead. | Open question for DeeDee; no code change. |
