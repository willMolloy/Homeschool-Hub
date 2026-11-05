# Sprint 15 verification (view-only access, whole-unit ranges, month view)

This is the tester pass for Sprint 15, ticket S15-05. It covers S15-00 to S15-04, S15-06 and S15-07 (commits ee185b1..867bdc7) on branch `claude/test-coverage-analysis-6dehbu`, tested at the branch tip 847682a (the Sprint 15 code is unchanged since 867bdc7; the tip also holds Will's Sprint 16 Records cards, which the viewer's Records page shows). Date: 2026-11-05 (the machine's date, and the app's "today" for America/Chicago).

I changed no product code, test code or scripts. This report and the ten small screenshots in `docs/reviews/sprint-15/` are the only files I added.

> **Independence note:** I am a separate tester agent and did not write the Sprint 15 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: READY for the PR to main (0 High, 0 Medium, 3 Low findings, 4 notes)

I attacked the view-only feature as three kinds of outsider: a viewer who wants to write, a viewer who wants another family's data, and a stranger holding (or guessing) a link. I found no way through. Every write route (32 routes, five different bodies each) is refused for a viewer. Every closed read is refused. Viewer answers carry no parent email, invite, view link, label, other viewer or setup state. Another family's data is unreachable by id, by filter, by header, by a forged account id or by a forged cookie. Removal and "Leave" end access on the very next request. A used, unknown, expired and cancelled link answer with the same 134 bytes on every join call. Eight racers on one link make exactly one person. In a real browser one login is a parent of their own family and a viewer of a co-op, the app opens the account used last, and "View only" and the account name show.

The three Lows: a viewer's write with an invalid or empty JSON body gets 400, not 403 (N1); a Mon/Wed book has no name at all at This month (N2); and the last day of a very slow book reads "Keep going" (N3). None changes data or leaks anything.

## Numbers

- **Gate:** `scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate), run once, first, on a clean tree.

  | Package | Tests |
  |---|---|
  | engine | 437 (and 437 in each of the 7 `test:tz` zones) |
  | api | 1189 |
  | web | 1576 |
  | db | 180 |

  These match the developer's S15-07 counts exactly.
- **Tickets:** 7 of 7 built tickets pass their "Done when" (S15-00 to S15-04, S15-06, S15-07). S15-05 is this report.
- **Smoke:** one full round, **all 30 scenarios exit 0**, `view-only` ("PROBLEMS none") and `accounts` ("PROBLEMS: none") included, plus `sheets`, `term-review` and `completion` ("ok"), `new-family` ("PROBLEMS: none"), and `tap-targets` ("No undersized controls", also run at 320 px with `TAP_EMAIL=smoke@example.com`, which adds the event form). I re-seeded the database before every scenario except `kids-edit`.
- **My own attacks:** about 330 direct API requests aimed at the viewer boundary (list in the Security section), plus 20 scripted browser flows (Playwright, Chromium).
- **My own browser sweep:** 12 viewer page states (Schedule Week, a bar's detail, the Print sheets dialog, Year, This month, a picked Year bar, Records, the Export dialog, Term in review, the print week sheet, the print day sheet, the Account menu) at 320, 360 and 1280 px in light and dark = **72 states**: no sideways scroll, no edit-like control, axe clean, no control under 44 px (the only hits were the six Export checkboxes, which the smoke rule measures as their 288 x 60 px labels, so they are fine). Page errors: 0. Requests to any host except 127.0.0.1: 0 (I blocked and logged them).
- **Findings:** 0 High, 0 Medium, 3 Low (N1 to N3), 4 notes (N4 to N7).

## Setup

- Postgres 16 (role hh/hh) on 127.0.0.1:5432. A leftover scratch database from the lost attempt (`hh15_dev`) was dropped first; a new one with the same name was made with `db/demo.ts --no-serve` and `scripts/smoke/seed-second-family.ts`, then given a co-op family ("Maple Co-op", two children, four subjects, seven assignments, six log entries) made through the real CLI invite and join. **The database was dropped at the end** (only `hh_dev` and `hh_test` remain).
- API on 127.0.0.1:3000 (`LOG_LEVEL=info`, so every request was logged and I could search the log), Vite on 127.0.0.1:5173 (and one extra Vite on 5174 serving a copy of the code from just before S15-07, to compare the Year and term views). All stopped afterwards. Nothing was exposed and nobody was contacted.
- The API's throttle is per address and in memory, so I restarted the API between groups of requests that needed a clean window.
- Browser: Playwright's Chromium (`/opt/pw-browsers`), `CHROME_PATH` set for the smoke scripts. Nothing installed. No secrets were printed; link tokens in this report are never shown. The scratch logins all use throwaway passwords.
- The cast: `coop@example.com` (the co-op's parent), `smoke@example.com` (parent of "Chen family", later also a viewer of the co-op: the "one person in two accounts"), `empty@example.com` (a second existing login), a brand-new person (Nora), and `demo@example.com` (an outsider whose data a viewer must never see).

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S15-00 Sprint 14 leftovers | **Pass** | N1: 8 parallel invite POSTs left exactly 5 open, 3 got 409 (and again 5 open after a second round). N2: the print week sheet of two children with nothing planned has 0 axe violations at 320/360/1280 px, light and dark; landmarks are now one per child. N3: `remove-parent` removed a second parent and signed them out, refused a family's last parent (exit 1), refused an unknown email (exit 1) and a malformed one (exit 2), removed a viewer-only person, and removed a person who was a parent in one family and a viewer in another (both memberships and sessions gone) |
| S15-01 View links and viewer accounts | **Pass** | Created with a label (201, token once, only the SHA-256 stored, plaintext not in the table), expires in 7.00 days, 17 and then 44 links open at once (no cap), 30 creations a minute allowed and the 31st to 33rd throttled, label over 60 characters 400. Redeemed as a brand-new person, as an existing login ("I already have an account", upper-case email works) and while signed in (one button, the same session moves, no new cookie). Used once only. Cancel works (204, then 404). Wrong password does not burn the link. Already a member gives 409 and the link stays open (as a parent member, as an existing viewer, by session and by login). Details below |
| S15-02 A viewer can never write | **Pass** (N1) | Route walk, forged ids, forged cookies, header and path tricks, leak scan: Security section |
| S15-03 The viewer's Schedule and Records | **Pass** | Browser: tabs are Schedule and Records only, "View only" and the account name on screen, bar detail has only Close, no edit control in 72 states, week, child, zoom, month, range, Export CSV, Term in review (Print, Save image) and print sheets all work and made no request but GETs; viewer screenshots in `docs/reviews/sprint-15/` |
| S15-04 Docs and smoke | **Pass** | `view-only` scenario exits 0 against my stack; the docs name `remove-parent` and the Sprint 15 checklist |
| S15-06 Whole-unit ranges | **Pass** (N3) | Browser, below |
| S15-07 Month view | **Pass** (N2) | Browser, below |

### S15-01 in detail

- **Link states:** used, unknown, expired (made 8 days old in the database) and cancelled links all answered **404 with the same 134-byte body** on `GET /api/join/:token`, on a new-person POST, on an "existing" POST (right and wrong password) and on a signed-in "use my session" POST: same status, body, content-length and headers. A malformed token (`abc`, 43 letters that were never a link) is the same 134 bytes. Response time for the used, unknown and expired link was the same (about 2 ms). Redeeming with a bad password gets 401 only for a live link, and an unknown email takes as long as a wrong password (about 55 ms either way).
- **Throttle:** `GET /api/join/:token` allowed 30 a minute then 429; `POST` allowed 10 then 429, even with a different `X-Forwarded-For` on every request (the spoofed header is ignored).
- **Races:** 8 simultaneous sign-ups on one link made exactly one person (one 201, seven 404). Four links redeemed at once by one existing person left one membership.
- **A parent link cannot make a viewer into a parent:** a parent invite redeemed by an existing login, or by a signed-in session, gets the plain 404 and is not used up.
- **Parents see names and emails, others do not:** the card lists each viewer's name, email and joined date with Remove; a parent of another family sees only their own family's links and viewers; the demo family cannot make view links (403).

### One person, two accounts, in a real browser (360 px)

`smoke@example.com` signed in to the Chen family (Home, "Chen family" as the family menu's title, "Signed in as Demo parent", no Switch row yet). Opening the co-op's link while signed in showed "View Maple Co-op" with a single button "Join as Demo parent" and no password field. After joining:

1. Landed on Schedule with **View only | Maple Co-op | Account**, tabs Schedule and Records only.
2. Account menu: "Signed in as Demo parent", the view-only sentence, **Switch to Chen family**, Leave Maple Co-op, Sign out (screenshot `account-switcher-viewer-360.png`).
3. Switch to Chen family: Home, tabs Home, Schedule, Records, Set up. Family menu: title **Chen family**, **Switch to Maple Co-op** marked **View only** (screenshot `account-switcher-parent-360.png`).
4. Signed out and in with Chen last used: opened Chen family (parent). Switched to the co-op, signed out and in: opened **Maple Co-op, role viewer, on /schedule**. A reload keeps the co-op.
5. A viewer typing `/`, `/setup/settings`, `/setup/children` or `/welcome` is sent to Schedule; `/records/review` and `/print/week` open (they are read-only).
6. A viewer can **leave** from the Account menu: a two-step "Leave Maple Co-op? ... Yes, leave | Stay"; the device lands on the person's own family (Home), role parent, one account left.

### S15-06 in the browser (a co-op book at about 1.3 chapters a day)

The Secret Garden, 27 chapters over 21 school days (1.29 a day), printed week by week (six weekly sheets, as a viewer):

`1 | 2-3 | 4 | 5 | 6 | 7-8 | 9 | 10 | 11-12 | 13 | 14 | 15 | 16-17 | 18 | 19 | 20-21 | 22 | 23 | 24 | 25-26 | 27`

No chapter appears twice, no chapter is skipped, and the last day ends on 27. The same holds for a 20-chapter book at 1 a day (1 to 20) and a 150-page book (1-8, 9-15, 16-23 ... 144-150, no page repeated). A slow book (8 chapters over 20 days, 0.4 a day) prints "Keep going: Chapter 1 | chapter 1 | Keep going: Chapter 2 | chapter 2 | Keep going: Chapter 3 ..." and ends on chapter 8. **The Week bars agree with the sheets** in every week I compared: Secret Garden "chapters 1-6, 7-13, 14-19, 20-26, 27" (the days of each week add up to exactly that), Pages book "pages 1-38, 39-75, 76-113", Little House "chapters 1-2, 3-4, 5-6". The daily sheets agree too (Wed Nov 4: Secret Garden "chapters 16-17", Little House "Keep going: Chapter 2"; Thu Nov 5: "chapter 18", "chapter 2").

### S15-07 in the browser

At **This month** (November, as a viewer, 1280 and 360 px):

- **Poetry Mon/Wed:** nine separate blocks (Nov 2, 4, 9, 11, 16, 18, 23, 25, 30) in one lane row, **0 connectors anywhere on the page**. See N2 about its missing name.
- **Math Mon-Fri:** one steady bar.
- **Two History books in sequence** (Story of the World 1 then 2) sit on **two rows** (y 140 and 174.5); each of the seven assignments has its own row; the badge sits on the lane's first row and the lane grows with its rows. Screenshot `month-view-1280.png`.
- **Year and term zoom unchanged:** I served a copy of the code from just before S15-07 and compared the Chen family's Year, Fall and Spring views at 1280 and 360 px (parent session): every band path, connector, name and height is **byte-identical** old versus new, and the bars still share rows (21 bands in 14 rows at Year). I could not make a connector appear at Year in my data (bars cross breaks as washed bands in a continuous run), so for "term zoom still draws connectors" I rely on the developer's `timeline-pieces` test (it expects them at Year and Term) rather than a browser sight.

## Security: every attack I tried and what happened

Attacker is **Nora** (a viewer only, no family of her own) unless stated. "Refused" means `403 {"error":"view_only"}`.

| # | Attack | Result |
|---|---|---|
| 1 | Walk every registered route (58, read from the source): 32 write routes x 5 bodies (none, `{}`, malformed JSON, a valid-looking create with another family's id in it, a link label) = 160 requests | 128 refused; the 32 malformed-JSON ones got **400** from the body parser, not 403 (N1). **Nothing changed**: a md5 of every table before and after is identical |
| 2 | The 7 read routes that are not on the allow-list (calendar templates, check-in weeks, parents, viewers, time zones, undo, weight suggestion) | all refused |
| 3 | The 13 allowed reads | all 200 |
| 4 | POST/PUT/PATCH/DELETE/OPTIONS on each of the 13 allowed paths (65 requests) | all refused or 404/405 |
| 5 | HEAD on four closed routes | refused |
| 6 | Path tricks: trailing slash, upper-case, double slash, `%2F`, `;x`, `/./`, `/../`, `%76iewers`, a query string | refused or 404, never a 200 |
| 7 | Headers: `X-HTTP-Method-Override`, `X-Method-Override`, `X-Family-Id: <other family>`, `X-Role: parent`, `X-Forwarded-For: 127.0.0.1` | no effect (refused) |
| 8 | Another family's data by id and filter: its child id as `childId`/`childIds`, its family id as a query parameter, its assignment id, `includeArchived`, plan and log and totals for its child; a Chen log entry with a unique note planted first | none of Chen's ids, names, emails or the note appear in any answer (the totals call echoes the id I sent with all zeros, N7) |
| 9 | Forged account switch: another family's id, a random uuid, a malformed id, an extra key, no body | all `404 account_unavailable`, **identical for "not yours" and "does not exist"**; the session stayed on the co-op |
| 10 | A made-up cookie; the stored session id (the hash) used as the cookie | 401 both |
| 11 | A viewer calls leave and parent-only routes: a parent calls `/api/auth/leave` | parent: 403 `not_a_viewer` |
| 12 | A viewer deletes another viewer (`DELETE /api/family/viewers/:id`); a **parent of another family** deletes this co-op's viewer; the co-op's parent tries to delete a parent through the viewers route | 403; 404; 404 (and that parent still signs in) |
| 13 | Leak scan of all 13 allowed answers (with an open parent invite, an open view link labelled `SECRET-LABEL-XYZ`, and three other viewers present) for `@`, the parent's and viewers' names and emails, "token", "invite", "label", "password", "hash", `createdBy`, `parentId` | clean. `/api/me` has `setupStep 6, setupDone true, hints all seen, checklistHidden true, demo false`, only the viewer's own name and only their own accounts; `/api/family` has no parent or invite fields |
| 14 | Headers on viewer API answers | `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store` on every one. Viewer pages carry `<meta name="robots" content="noindex, nofollow">` and `<meta name="referrer" content="no-referrer">` |
| 15 | Remove a viewer as the parent | the viewer's next request is **401**; their login is gone (no orphan, 0 rows), a second device is dead too |
| 16 | Remove a viewer who has their own family (`empty@`) | the co-op session is 401; they still sign in to their own family; one membership left |
| 17 | A viewer leaves (`smoke@`, parent of Chen) | 200, device moves to Chen (parent); switching back to the co-op is 404 |
| 18 | A viewer switches to the account they also parent, then back, while writing in each | in the co-op: write 403; in Chen: write 201 (the role comes from the membership of the account on screen) |
| 19 | Escalation: redeem a **parent** invite with an existing login or with a signed-in session | 404 plain, invite not used up and still usable by a new person |
| 20 | A viewer link redeemed by someone already in the account (parent member, existing viewer) | 409 `already_member`, link not consumed (checked in the database) |
| 21 | Throttle bypass by changing `X-Forwarded-For` on every request | still throttled |
| 22 | Stored XSS: a viewer named `<img src=x onerror=...>`, a link label `<script>...</script>`, a family named `Maple <b>Co-op</b>` | shown as text in the parent's Family settings and in the viewer's own Account menu; nothing executed, no element injected |
| 23 | Tokens and passwords in logs (`LOG_LEVEL=info`) | join URLs are logged as `/api/join/[redacted]`; no link token, password or cookie appears in the log |
| 24 | Request size: 3 MB body from a viewer | 413 |
| 25 | Demo family makes a view link or parent invite | 403 |
| 26 | Email probing: join with a live link and a registered email | 409 "email already used" (N4); with the sign-in route the answer is the same for unknown and wrong |
| 27 | Over-long token (500 characters) in a join URL | 414 framework JSON, not the plain message (N5); it is the same for every such token, so it says nothing about links |

## Findings

**N1 (Low): a viewer's write with an invalid or empty JSON body gets 400, not 403.** Steps: sign in as a viewer, `POST /api/children` with `content-type: application/json` and the body `garbage{{` (or no body at all). Result: `400 FST_ERR_CTP_INVALID_JSON_BODY` (or `FST_ERR_CTP_EMPTY_JSON_BODY`). Fastify parses the body before the `preValidation` hook that checks the role. A valid body, a `text/plain` body and every other route give the expected 403. Same for a signed-out request (400, not 401). Nothing is written and nothing leaks (the answer is the framework's, the same one a parent gets), so this is not a hole, but S15-02's "every non-GET returns 403" and the progress note "refused before the body is read" are not literally true. Its own route-walk test sends a parseable garbage body. Fix if wanted: check the role in an `onRequest` hook (before body parsing) or add a content-type parser error handler.

**N2 (Low): a Mon/Wed book has no name at This month.** Steps: a book on Mon and Wed only (weekdays [1,3]), open Schedule, Year, This month at 1280 px or 360 px. Result: nine separate squares in the book's lane row and no text at all, inside or outside (the other six assignments are named; `g.tl-names` has six entries for seven bars). This follows the S10-04b fallback (rule 4: if neither the block nor the free space up to the next block holds the name, no name), and S15-07 step 3 says "outside if it doesn't fit", but here the gaps are about 50 px, so nothing fits. The row is identified only by its lane icon and by tapping it. Will may want the name drawn once for the whole run (to the left of the first block, or in the lane list under the chart) for sparse books.

**N3 (Low, wording): the last day of a very slow book says "Keep going".** Steps: an 8-chapter book over 20 school days (0.4 a day), print the last week. Result: day 19 "chapter 8", day 20 "Keep going: Chapter 8". It ends on the right chapter (as the ticket asks), but the finishing day reads like an unfinished one. Only visible for books slower than half a chapter a day.

**Notes (not defects):**

- **N4 (pre-existing from Sprint 14):** anyone holding a live link can learn whether an email already has a login (409 "That email is already used for a sign-in"), 10 tries a minute per address. The "I already have an account" route does not leak. Accepted trade-off unless Will wants the join page to say nothing.
- **N5:** a join URL whose token is more than 100 characters long answers 414 with Fastify's own JSON that echoes the path. It does not reveal anything about real links (every such token gets it). The 134-byte identical message holds for every token of normal length.
- **N6:** the join page for a view link has `referrer: no-referrer` but no `robots: noindex` meta (the signed-in viewer pages have both). The token is single use and 7 days, so the exposure is small.
- **N7:** `GET /api/records/totals?childId=<another family's child>` returns 200 with that id echoed and all zeros instead of 404. No data comes back; the child filter simply matches nothing.

## What Will should look at first

1. **The month view's Mon/Wed row (N2).** Open the co-op or any family with a Mon/Wed book, Schedule, Year, This month: the row of squares has no name. Decide whether that is how you want it.
2. **Print the weekly sheet of your slowest book and your Secret Garden (S15-06).** The chapters now never repeat; check you like "Keep going: Chapter 2" on the days between (and N3 on the last day).
3. **Try the one-login, two-account flow on your phone** (join a co-op link while signed in, then Switch to ... from Home and the Account menu): it behaves well here, but it is the part you will feel most.
4. Then the small Lows (N1, the viewer's invalid-JSON answer) when convenient.

## Screenshots (`docs/reviews/sprint-15/`)

| File | Shows |
|---|---|
| `viewer-schedule-week-360.png` | A viewer's Schedule, Week: "View only | Maple Co-op | Account", Schedule and Records tabs only, whole-unit ranges ("chapters 14-19") |
| `viewer-records-360.png` | A viewer's Records: Export and Term in review, range chips, child switch, totals; nothing editable |
| `account-switcher-viewer-360.png` | The viewer's Account menu: Signed in as, Switch to Chen family, Leave, Sign out |
| `account-switcher-parent-360.png` | The same person's family menu in their own family: "Chen family", Switch to Maple Co-op, View only |
| `month-view-1280.png` | This month: nine Mon/Wed blocks with no line, Mon-Fri bars, two History books on two rows |
| `printed-week-sheet-360.png` | The printed weekly sheet: no repeated chapter, "Keep going" days |
| `viewer-bar-detail-360.png` | A bar's read-only detail (only Close) |
| `viewer-year-320-dark.png` | A viewer's Year at 320 px in dark mode |
| `parent-view-only-card-360.png` | The parent's View-only access card: viewers with name, email and Remove, open link with Cancel |
| `viewer-term-review-320-dark.png` | Term in review for a viewer (Print, Save image) at 320 px in dark mode |
