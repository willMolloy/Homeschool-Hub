# Sprint 14 verification (accounts, and undo for Add several and CSV import)

This is the tester pass for Sprint 14, ticket S14-07. It covers S14-00 to S14-06 (commits 5d0db47..135f398) on branch `claude/test-coverage-analysis-6dehbu` at 135f398. Date: 2026-11-05 (the machine's date; the app's "today" for the demo family's Chicago time zone was Nov 4).

I changed no product code, test code or scripts. This report and the eight small screenshots in `docs/reviews/sprint-14/` are the only files I added.

> **Independence note:** I am a separate tester agent and did not write the Sprint 14 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: READY for the PR to main (no High or Medium findings; three Lows and three notes)

I attacked the invite, session and family-scoping code the way an outsider with a valid link, or a parent of another family, would, and found no way in. Every dead link (expired, used, cancelled, unknown, malformed) answers with the same 134 bytes. Eight parallel redeems of one link made exactly one family. Redeeming and sign-in are throttled and the throttle ignores a spoofed `X-Forwarded-For`. The database holds only the SHA-256 of each token and of each session cookie, and no log line holds a token, password or cookie. About 75 requests from parent A's session aimed at family B's children, subjects, assignments, records, invites, settings and undo were all refused, and a byte-level check of every table showed none of them changed anything. A 60-row CSV import is two requests and one Undo; Undo is refused (409, nothing deleted) once a check-in, a completion answer or a log entry depends on any imported row, including one only in the second chunk. The gate is ALL GREEN and all 29 smoke scenarios pass, `accounts` included.

The Lows: the "at most 5 open invites" cap can be beaten by parallel requests (N1); the print sheet of a child with nothing planned fails one axe rule (N2, in Sprint 13 code); and no command exists to remove a parent although the Sprint 14 README says there is one (N3).

**Fonts: no finding.** The built app makes no request to `fonts.googleapis.com` or `fonts.gstatic.com`. See "Fonts" below.

## Numbers

- **Gate:** `bash scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate), run once on a clean tree before anything else was running.

  | Package | Tests |
  |---|---|
  | engine | 437 (and 437 in each of the 7 `test:tz` zones) |
  | api | 1148 |
  | web | 1541 |
  | db | 174 |

  These match the developer's S14-06 counts exactly.
- **Tickets:** 7 of 7 built tickets pass their "Done when" (S14-00 to S14-06). S14-07 is this report.
- **Smoke:** one full round, **all 29 scenarios exit 0** (`auth axe-2a axe-log axe completion edge engine-version full-flow kids-add kids-edit kids-list login new-family plan-debug records s2a-12-hub s2a-13-settings s2a-14-assignments s2a-15-days-off s2a-16-events s2a-17 s2a-hardening sheets subjects-add subjects-edit subjects-list tap-targets term-review accounts`). `accounts` ends "PROBLEMS: none", `new-family` "PROBLEMS: none", `sheets`, `term-review` and `completion` end "ok", `tap-targets` ends "No undersized controls on the listed screens." (also with `TAP_EMAIL=smoke@example.com` at 320 and at 1280 px, which adds the event form). No scenario printed a page error. I re-seeded the database before every scenario except `kids-edit` (which needs the child `kids-add` made), and ran with `SMOKE_EMAIL=smoke@example.com`.
- **My own sweeps** (Playwright, Chromium, scripts in the tester's scratchpad, not committed):
  - 66 page states (Login, Home, Family settings with Parents, Assignments, Children, Records, Term in review, Schedule Week and Year, the print week sheet, the Home family menu) at 320, 360 and 1280 px in light and dark: no sideways scroll, no control under 44 px, axe clean, **except** the print week sheet's axe finding in N2.
  - The join page (live link) at the same six combinations, and the dead-link page at 320 and 360 px: 0 problems.
  - Page errors across everything: 0. Requests to any host other than 127.0.0.1: 0 (I blocked and logged them).
- **Findings:** 0 High, 0 Medium, 3 Low (N1, N2, N3), 3 notes (N4, N5, N6).

## Setup

- Postgres 16 (role hh/hh) on 127.0.0.1:5432. Scratch database `hh14_dev`, made with `db/demo.ts --no-serve` and `scripts/smoke/seed-second-family.ts` (demo@, smoke@, empty@, fresh@). **The database was dropped at the end** (only `hh_dev` and `hh_test` remain).
- API on 127.0.0.1:3000 with `LOG_LEVEL=info` (so every request was logged and I could search the log), Vite on 127.0.0.1:5173. Both stopped afterwards. Nothing was exposed and nobody was contacted.
- The API's throttle is per address, so I restarted the API between groups of requests that needed a clean window.
- Browser: Playwright's Chromium (`/opt/pw-browsers`); smoke ran with `CHROME_PATH` set to it and `SCREENS_DIR` outside the repo. Nothing installed. No real secrets were printed; invite tokens in this report are never shown.
- Session ages were simulated by moving `created_at`, `last_seen_at` and `expires_at` back in the scratch database.

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S14-00 Sprint 13 leftovers | **Pass** | N1, N2, N3 and N5 each fixed; details below |
| S14-01 Parent logins | **Pass** | demo@, smoke@, empty@, fresh@ all sign in through the real form; parents sign in by email in any case; `set-parent-login` and the `set-family-login` alias work |
| S14-02 Family invites and join page | **Pass** | CLI link works once; all dead links identical; one family from eight racers; throttled; hash only; clean logs |
| S14-03 Invite another parent | **Pass** (N1, N4) | Parent 2 joins the same family, sees the same data; cancel works; cap holds one at a time |
| S14-04 30-day sessions | **Pass** | Sliding expiry by simulated clock; sign-out ends only that device |
| S14-05 Undo for Add several and CSV import | **Pass** | 60 rows = 2 requests = 1 Undo; three refusal rules hold |
| S14-06 Docs and smoke | **Pass** | `accounts` passes; LOCAL_TESTING steps match what I did |

## S14-00: Sprint 13 leftovers

- **N1 (stopped labels), two bars close together:** I rebuilt the Sprint 13 repro on `smoke@example.com` (Frank, Literature): "The Adventures of Tom Sawyer extended edition" Oct 12 to Nov 27 stopped Oct 20 and "Tiny" Oct 26 to Nov 20 stopped Oct 28, which share one row on Schedule > Year, plus two more close pairs ("Ab", "Cd"). I measured every label rectangle in the chart at 320, 360, 390 and 1280 px (light, and 320 dark). **No two labels overlap at any width.** At 320 and 360 the long-titled bar gets no word (dropped, by the developer's rule; its dashed bar is still there and opens its edit sheet); at 390 and 1280 it gets "Stopped" to the left of its bar (x 45-91 against Tiny's label at x 124-203). "Tiny · Stopped" reads in full at every width (`n1-stopped-320.png`). Nothing scrolls sideways. See note N6.
- **N2 (review page footer):** at 320 x 568 the footer is `position: static` (it scrolls with the page), at 360 x 740 and wider it is sticky. After scrolling to the bottom the pager arrows end above the footer at 320 x 568 (arrows 356-400, footer starts 408), 360 x 740, 390 x 844, 390 x 664 and 1280 x 800, in light and dark, with a child with nothing ("Zed") in the family. No arrow is ever under the footer. Axe clean, no control under 44 px.
- **N3 (Records buttons):** Log 73 x 45, Export 95 x 45 and Term in review 153 x 45 at 320, 360, 390 and 1280, in light and dark. They were 66 px high before.
- **N5 (day off names its day):** Frank-only day off Nov 5 "Dentist" prints "Thu · Dentist" on his week sheet (Nov 5, 2026 is a Thursday; the ticket's "Wed" was only an example). A two-day run Nov 12-13 with no label prints "Thu–Fri · Break" (see N6). A whole-family day off ("Family trip", Nov 19) still prints "Family trip" once per child sheet with no day prefix, and the day sheet for Nov 5 reads "Dentist" and "Nothing planned for Thursday", as before.

## Existing sign-ins (S14-01)

Through the real sign-in page at 360 px, all four land where they should and the family menu says who is signed in:

| Login | Lands on | Family menu |
|---|---|---|
| demo@example.com | Home | Signed in as Demo parent |
| smoke@example.com | Home | Signed in as Demo parent |
| empty@example.com | Home | Signed in as Empty |
| fresh@example.com | `/welcome` ("What should we call your family?") | (setup flow) |

A wrong password and an unknown email show the same page text ("Email or password is incorrect.") and the API gives the same body and 401 for both; median time over four tries was 53 ms against 46 ms (both do the hashing; the gap is within noise at this sample size). A parent signs in with the email in any case (`PARENT2@example.com`). `set-parent-login` with an unknown email exits 1 ("No parent with the email ..."), with a 5-character password exits 1, and never prints the password; the `set-family-login` alias still works.

## Family invites (S14-02)

- **Link works once:** `create-family-invite` printed `http://127.0.0.1:5173/join/<43 characters>`, valid for exactly 7 days (`expires_at - created_at = 7.0 days`). The join page (name, email, password, "Create my sign-in") made a family, signed me in, and landed on `/welcome` "Step 1 of 6 / What should we call your family?" with "Our family" prefilled. The token is not in the address after joining. Opening the same link again (even signed in) shows "This link can't be used" and the plain message.
- **Identical dead links, byte for byte:** I tried expired, used, cancelled, an unknown well-formed token, a short one, a 5,000-character one, `%00%2e%2e` and a non-ASCII one, on both `GET /api/join/<token>` and `POST /api/join/<token>` (with a valid body). Result:

  | Case | GET | POST |
  |---|---|---|
  | expired, used, cancelled, unknown, short, `%00%2e%2e`, non-ASCII | 404, 134 bytes, identical | 404, 134 bytes, identical |
  | 5,000 characters | 414 (Fastify's parameter-length limit, 5,133 bytes) | 414, same |
  | `..` or a token containing `/` | 404 `not_found`, 21 bytes (no route matches) | same |

  Body for the 134-byte case: `{"error":"invite_unavailable","message":"This invite link has expired or was already used. Ask the person who sent it for a new one."}`. The last two rows are the web server's own answers for something that cannot be a token (not a real token's three states), so they say nothing about a real link. In the browser the dead page text for expired, cancelled and used links is identical too, and the unknown and malformed links show the same plain message with a "Sign in" link (axe clean, 44 px).
  A dead link with an invalid body gives 400 ("Enter your name.") and so does a live link with an invalid body, so the body check is not an oracle either, and a live link is not burned by a bad body or a taken email.
- **Simultaneous redeems:** one new-family link, eight parallel POSTs with eight different emails: **1 x 201, 7 x 404**, one family, one parent, one session. Two parallel redeems with the *same* email: 201 and 404, one family. A taken email (checked case-insensitively, `DEMO@example.com`) gives 409 and leaves the link usable (it still previews 200); no family without a parent was ever left behind.
- **Throttle:** POST: the 11th try in a minute gets 429 (10 allowed); GET: the 31st gets 429 (30 allowed); sign-in: the 11th gets 429. A spoofed `X-Forwarded-For` and `X-Real-IP` did not get past it (still 429, `Retry-After: 60`).
- **Storage:** `invite.token_hash` equals SHA-256 of the token, and a text search of the whole invite row for the token finds nothing; the table has no token column. Passwords are stored as `scrypt$...` (130 characters) and do not contain the password. Session ids are the SHA-256 of the cookie; using a stored hash as a cookie gives 401.
- **Logs:** with `LOG_LEVEL=info` the API wrote 15,474 lines across the whole pass. All 170 join requests logged as `/api/join/[redacted]`. A search for any 43-character token-like string, `correct-horse`, `demo-password`, `brand-new`, `hh_session` or `set-cookie` finds **0 lines**. The Vite log holds no token either. (The two lines that show characters after `[redacted]` are my own made-up path with a `/` in it, not a token.) The page sends `<meta name="referrer" content="no-referrer">`.
- **Input rules:** passwords of 0, 5 and 1,001 characters, an extra field (`familyId`), and a name holding a NUL byte are each refused with 400 and do not burn the link.
- **Injection:** SQL-looking email and password at sign-in give 401. A parent name `<img onerror=...><script>` renders as text in Family settings, with no element injected and no script run; an HTML family name shows as text in "Join ..." on the join page.

## "Invite another parent" (S14-03)

- **Browser:** Family settings > Parents at 320, 360 and 1280 px in light and dark: no sideways scroll, axe clean, every control 44 px or more (Cancel invite measured 139 x 45). "Invite another parent" showed `http://127.0.0.1:5173/join/<43 characters>` in a read-only box with Copy link and the text "It works once and ends in 7 days. It is shown only now; if you lose it, cancel the invite and make a new one." (`parents-invite-320-light.png`). The headless browser has no share sheet, so Share did not show (as designed).
- **Parent 2 joins:** the page says "Join Demo family" with a "Join" button; after submitting, the second parent lands on Home (no setup flow), `setupDone` is true, and the family id equals parent 1's. Children, assignments and Family settings are the same from both logins (Children page text identical; a child Parent 2 made appeared for Parent 1). Parent 2 signs in separately by email, the Parents list shows both ("Demo parent", "Sam Second (you)"), and either can invite and cancel. The family menu says "Signed in as Sam Second".
- **Single use:** the used link now gives the plain message in the browser and 404 from the API.
- **Cancel:** Cancel invite (accessible name "Cancel invite made Nov 5") says "Invite cancelled." and the open list shrinks by one; the cancelled link then gives 404, and cancelling it again gives 404.
- **Five-invite cap:** six clicks in the UI give five open invites and "Cancel an invite you no longer need before making another." on the sixth (`parents-cap-360.png`). Cancelling one allows another. **But parallel requests beat it: see N1.**
- **Other checks:** the list holds only id and two dates (no token, no email). The demo family gets 403 `demo_read_only`. No session gives 401 (429 first if the throttle is already used up). A malformed invite id on DELETE gives 404.

## Sessions (S14-04)

Timestamps moved in the scratch database; each row is a real request to `/api/me`.

| Simulated case | Result |
|---|---|
| Used once a day for 40 days (shifted back one day before each request) | still valid after day 40; `expires_at` stays 30 days ahead |
| Idle for 31 days | 401 |
| Idle for 29 days | 200; cookie re-sent with `Max-Age=2592000`; `expires_at` moved to 30 days from now |
| Expired one second ago | 401 |
| Expires in five seconds | 200 |
| Used again within the hour | no write to the session row |
| Expired rows at sign-in | deleted (1 before, 0 after the next sign-in) |

In the browser, a device idle for 31 days is sent to `/login` ("Sign in", `session-expired-390.png`) and one idle for 29 days stays signed in with a fresh 30-day expiry.

**Sign-out ends only that device:** two browser devices of one parent; "Sign out" in the family menu on device 1 sent it to `/login` (and `/records` there stays `/login`), device 2 stayed signed in. With the API: after parent 1 signs out, parent 2 of the same family, another device, and another family are all still 200. Logging out an expired session answers 204.

**`set-parent-login` signs out only that parent:** after resetting `parent2@example.com`, that parent's session was 401 and the old password gave 401, the new one 200; the other parent of the same family on two devices and another family's parent were all still 200. The new password never appeared in the command's output.

**Deleting a parent** (by hand in the database) removes that parent's sessions and the cookie gives 401; the family stays.

## Undo for Add several and CSV import (S14-05)

- **60-row CSV, in the browser at 390 px:** pasted rows `Math,CSV book N,Frank,lessons,40,2026-11-02,2026-12-18` (the page said 60); Import sent **two requests**: 50 rows with `undo: { label: "Imported 50 assignments" }` and 10 with `undo: { label: "Imported 60 assignments", append: true }`. The bar read "Imported 60 assignments. Undo" (`role="status"`, Undo button 67 x 44 px, axe clean, no sideways scroll; `csv-import-undo-bar-390.png`). The family went from 20 to 80 assignments, one tap on **Undo** took it back to 20, and the undo entry was gone.
- **Add several:** six rows sent one request with `undo: { label: "Added 6 assignments" }`, the bar said "Added 6 assignments. Undo", and one Undo returned the count to where it started.
- **Refusals** (same endpoint, family `smoke@`; each case made two fresh assignments with an undo entry, then added a dependency on one of them):

  | Dependency | Undo | Nothing deleted? | Entry afterwards |
  |---|---|---|---|
  | check-in saved through the API (`PUT /api/check-ins/...`) | 409 `cannot_undo`, "That change can't be undone any more." | yes | dropped (next Undo: 404) |
  | completion answer (`ended_as`) set in the database | 409, same message | yes | dropped |
  | log entry in `log_entry` (inserted in the database; the app no longer writes this table) | 409, same message | yes | dropped |
  | 60-row import where only a row in the **second** chunk has `ended_as` | 409, same message | yes (all 60 remain) | dropped |

  In the browser, importing two rows and then adding a log entry for one before tapping Undo shows "That change can't be undone any more." in the bar's status and removes nothing (`undo-refused-390.png`). Setting a completion answer through the app (`PATCH`) replaces the undo entry with "Marked ... finished", as the developer said, so this refusal is a backstop.
- **Control:** an undo with no dependency removes exactly the created assignments (count back to start).

## Security: what I tried and what happened

All of these ran against the scratch database. "Refused" means a 4xx and no change.

**Invite links**

| Attack | Result |
|---|---|
| Expired, used, cancelled, unknown, malformed and over-long tokens on GET and POST | One 134-byte 404 for every real case; the two route-level variants are not token states (above) |
| Learn a link's state from a bad body, or from a dead link plus a bad body | Not possible: the body check comes first and says the same for live and dead links |
| Redeem one link with 8 parallel requests | Exactly one 201; one family |
| Redeem with a taken email (any case) | 409, link not burned, no orphan family |
| Extra field `familyId` (B's id) in the join body | 400 "Unrecognized key" |
| Redeem parent A's invite and check which family I joined | Joined A's family only, never B's |
| Redeem a link more than 10 times a minute, or look up more than 30 times, with a spoofed forwarded address | 429 on the 11th and 31st; spoofed headers ignored |
| Find the token in the database or the logs | Not there (hash only; `[redacted]` in logs) |
| Guess a token by shape | 256 bits (32 random bytes, 43 base64url characters); not attackable |
| SQL and HTML in name, email and family name | Treated as data; rendered as text |

**Cross-family isolation (parent A = a brand-new family; family B = the `smoke` family with 2 children, 6 subjects, 20 assignments, days off, events, a week adjustment, a log entry, an open invite and a live undo entry).** About 75 requests, with B's real ids:

| Area | What I tried with A's session | Result |
|---|---|---|
| Children | list; PATCH B's child | list holds only A's; PATCH 404 |
| Subjects | list; PATCH B's subject | only A's; 404 |
| Assignments | list; PATCH and reset B's assignment; create with B's subject, B's child, or A+B children; move A's assignment to B's subject or child; bulk create with B's ids | only A's; 404 or 400 `invalid_reference` ("every id must be one of your active ...") |
| Days off and events | list; PATCH and DELETE B's; create with B's child; event rule naming B's subject; preview with B's child or B's event id | only A's; 404 or 400 |
| Records and log | GET log-entries, run-days, totals with B's child id; POST with B's child (alone or with A's); PATCH and DELETE B's log entry | 200 with nothing of B's (totals, see N5), 400 `invalid_reference`, 404 |
| Week adjustments and check-ins | PUT adjustment (B's assignment, B's child, or A's assignment with B's child); batch PUT; DELETE B's; PUT check-in naming B's rows | 400 or 404 every time |
| Plan | GET plan for the month; POST pace with B's ids | A's plan holds no id of B's; pace answers (N5) |
| Invites | GET parents list; DELETE B's invite (also upper-case id); DELETE a malformed id | A's list has none of B's parents or invites; 404 for each; B's invite still works |
| Settings | PATCH family with `familyId` of B; PATCH name | 400 for the foreign key; the name changed A's own family only |
| Undo | GET undo; POST undo while B has an undo entry | `null` and 404 "Nothing to undo."; B's entry and B's data untouched afterwards |
| Identity tricks | `x-family-id` header; `?familyId=B`; B's stored session hash as a cookie; a random cookie | header ignored (A's data); query refused (400); 401; 401 |
| Join B through A's invite | see invites above | joined A |
| Database level | insert a session for family A that names a parent of family B | refused by the composite foreign key `session_parent_fk` |

After the second pass I compared an `md5` of every table (except `session`) before and after the attacks: **no table changed**, other than `family` by my own deliberate rename of A's family. B's undo entry and B's assignment title were the same afterwards.

**Sessions and accounts**

| Attack | Result |
|---|---|
| Use a session 31 days idle, or one expired a second ago | 401 |
| Revive an expired session by logging out of it | 204 and still 401 afterwards |
| Use another parent's or another device's cookie after a sign-out | 401 only for the signed-out device |
| Use a deleted parent's cookie | 401 (sessions cascade) |
| Use a session's stored hash as the cookie | 401 |
| Cross-site style POST with `text/plain` | 400 (JSON only); the cookie is `SameSite=Lax`, so a cross-site form POST would not carry it |
| Unknown email versus wrong password (body, status, page text, timing) | Same in all but timing noise (53 versus 46 ms median) |
| Sign-in flood | 429 from the 11th try a minute |
| Demo family invites another parent | 403 `demo_read_only` |

## Fonts

I looked for `fonts.googleapis.com` and `fonts.gstatic.com` three ways:

1. **Source and build:** a search of `apps/web/src`, `apps/web/index.html`, `apps/web/public` and the built `apps/web/dist` finds **no** reference. The only matches in the repository are seven design mockups under `docs/design/mockups/` (`pastel-cards.html`, `soft-paper.html`, `soft-paper-year-badges.html`, `year-polish.html`, `soft-paper-year.html`, `term-review.html`, `airy-minimal.html`), which are not part of the app.
2. **Self-hosted files:** `dist/assets` holds the Fraunces and Nunito Sans `.woff2` files (latin, latin-ext, vietnamese, cyrillic where relevant).
3. **At run time:** in Chromium, with every request to a host other than 127.0.0.1 blocked and logged, I loaded Login, the join page (live and dead), Home, the family menu, Family settings, Assignments (with the import and Add several forms), Children, Records, Term in review, Schedule Week and Year, and the print sheets, at six viewport and theme combinations. **No external request was made by any page.** The fonts the pages report as loaded are "Fraunces Variable" and "Nunito Sans Variable", and every font request went to `127.0.0.1:5173`.

So the Sprint 8 rule (self-hosted fonts, no external requests) still holds in the built app. The developer's remark that "the pages request Google Fonts, which the proxy refused" most likely came from opening one of the mockups; Sprint 14 changed no design files. I report this as **not a finding**; if the developer saw it on a real app page, I could not reproduce it and would like the page's address.

## General

- **320 / 360 / 1280 px, light and dark:** covered by the 66-state sweep and the join and Parents matrices above. No sideways scroll, no control under 44 px, axe clean, except N2. My checker also lists the hidden "Skip to content" link (107 x 23 px) that appears only on keyboard focus; the smoke `tap-targets` scenario does not count it and I agree it is exempt.
- **Tap targets:** join page button and links, Copy link, Invite another parent, Cancel invite (139 x 45), Undo (67 x 44), the family menu's Sign out: all 44 px or more. Smoke `tap-targets` passes at 320 (with events), 360 and 1280.
- **Axe:** `axe`, `axe-log`, `axe-2a` scenarios pass; my own runs add the join page, Parents section, undo bar and the Home family menu: clean.
- **Service worker:** `sw.js` is a 382-byte placeholder with an empty fetch handler; it caches nothing, so no invite page or API answer is kept on the device.

## Findings

### N1 (Low): the "at most 5 open invites" cap can be beaten with parallel requests

`POST /api/family/invites` counts the open invites and then inserts in two separate steps, so requests that arrive together all pass the count. With an empty list I sent eight at once from one signed-in parent: all eight returned 201 and eight invites were open (`open after: 8`). The next sequential request was refused with 409, and cancelling brought the list back under five, so the cap holds for a person using the page (the button is also guarded while a request is running). Only a signed-in parent can do this, it is limited by the 10-a-minute throttle on that route, and each invite is still single-use, family-scoped and 7 days, so the harm is a longer list than intended (the cap's purpose was avoiding mistakes and a stuck button).

Steps: sign in as any non-demo parent with no open invites; send 8 `POST /api/family/invites` at the same moment; `GET /api/family/parents` lists 8.

Suggested fix: count and insert in one statement (an `INSERT ... SELECT ... WHERE (SELECT count(*) ...) < 5`), or take a per-family advisory lock around the check.

### N2 (Low): the print sheet of a child with nothing planned fails axe `landmark-unique`

On `/print/week?week=2026-11-02&children=all` (and `/print/day?...`) a child with no assignments that week gets two `<section>` landmarks, `aria-label="Zed, Week of Nov 2, 2026"` and `aria-label="Notes for Zed"`, and axe reports `landmark-unique` (moderate, 2 nodes). The two children with work on that sheet (Frank and Margaret) are clean, which is why the `sheets` smoke (demo children, all with work) and the Sprint 13 sweeps did not see it. This is Sprint 13 print code (S14 only touched `sheetModel.ts` for N5), so it is not caused by Sprint 14; I found it because my test family had a new child with nothing yet.

Steps: sign in as a family with a third child who has no assignments (add "Zed"); open Schedule > Week > Print sheets > All children > Print; run axe on the print page.

### N3 (Low): no command exists to remove a parent, although the README says there is one

`docs/tickets/sprint-14-accounts/README.md` decision 5 says removing a parent is "not in the app for now; equal rights; Will or DeeDee can do it with a command". The only commands are `create-family-invite`, `set-parent-login` and the `set-family-login` alias (`apps/api/src/cli/`). `docs/HOW_WE_WORK.md` says it is "a database change, done by hand". I confirmed that deleting a parent row by hand does the right thing (their sessions go with it and the family stays), but a person who reads the README will look for a command that is not there. Either add a small `remove-parent <email>` command or reword decision 5 to say "by hand in the database".

### N4 (note): a throttled invite attempt shows "Couldn't save. Please try again."

When `POST /api/family/invites` is refused with 429 (10 a minute, per address) the Parents card shows the generic "Couldn't save. Please try again.", not the API's "Too many attempts. Wait a minute and try again." (the 409 cap message is shown correctly). It needs ten invites in a minute, so it is rare. Steps: create and cancel invites quickly until the eleventh within a minute.

### N5 (note): two read-only answers do not check that an id is yours, and a taken email is disclosed to a link holder

- `GET /api/records/totals?childId=<another family's child>` and `POST /api/plan/pace` with another family's child or subject id answer 200 instead of 404 or 400. They return zeros or a count computed from the caller's own calendar (nothing of the other family's; I compared), so this is an inconsistency, not a leak: other routes say "every id must be one of your active children".
- A holder of a valid link who tries an email that already has a sign-in gets 409 "That email is already used for a sign-in", so they can learn that an address has an account. The developer recorded this as a deliberate choice; I agree it is the smaller harm with a 256-bit link and a throttle, but Will should know it is there.

### N6 (note): three small observations

- **Responses carry no `Cache-Control: no-store` or other security headers** (including the response that holds a new invite's token). A POST response is not cached, so there is no problem today; it is a hosting-time item.
- **At 320 and 360 px, one of two close stopped bars has no word** (the long-titled one; its dashed bar still opens its edit sheet). That is the developer's N1 rule, not a bug; mentioned so Will is not surprised.
- **A day off made through the API with no label has kind `vacation`**, which the week sheet prints as "Thu–Fri · Break", whereas the progress note's example says "Thu–Fri · Day off". Sprint 13's unlabelled days off were made through the screen and read "Day off". I did not check which kind the Days off form gives an unlabelled range.

## What Will should look at first

1. **Make an invite and join with it** (`npm run create-family-invite -w @hh/api`, then open the link on your phone; `join-320-light.png`): check the wording, then finish the setup flow. Open the same link again and look at the plain message.
2. **Family settings > Parents on your phone** (`parents-invite-320-light.png`, `parents-cap-360.png`): invite a second parent, join in another browser, and cancel one. Decide whether you want the invite shown again somewhere (today a lost link means cancel and make a new one).
3. **Assignments > Import CSV, then Undo** (`csv-import-undo-bar-390.png`, `undo-refused-390.png`): paste more than 50 rows, tap Undo once, then try Undo after logging time on one of the imported books and read the refusal.
4. **Decide N3:** do you want a `remove-parent` command, or should the README say "by hand"?
5. **N1 is quick to fix** (one statement or a lock), and N2 is a one-line label change in the print sheet, both optional before the PR.

## What I did not check

- A real phone, Safari or Firefox; Chromium only. The Share button (it only exists where `navigator.share` does) was not exercised, and Copy link was checked only as far as its status text in a headless browser.
- A real deployment: HTTPS, the `Secure` cookie flag (it is only set in production), proxy-aware client addresses (on hold with hosting), or any attack from another machine. The throttle test showed that `X-Forwarded-For` is ignored today; behind a proxy that will need a deliberate setting.
- Sign-in timing differences at scale (I measured four tries each way).
- A bulk undo for a family with more than a few hundred assignments, and CSV files near the 1 MB cap.
- The `log_entry` table through the app (it is no longer written by it); I inserted rows by hand to test the refusal.
- One smoke round only, with the database re-seeded before each scenario.
