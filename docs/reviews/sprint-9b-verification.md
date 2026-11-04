# Sprint 9b verification (re-test of the Sprint 9 findings)

This is the tester's re-check of N1 to N17 and S9-05 from `docs/reviews/sprint-9-verification.md`, after the fixes in `docs/tickets/sprint-9b-fixes/` (S9b-01 to S9b-05). It was run on branch `hh2/sprint-9b` at commit 2ef2606: S9b-01 0a31fc7, S9b-02 426985e, S9b-03 db6bdf0, S9b-04 6e9c58b, S9b-05 3a247ae, then the docs commit 2ef2606. This is S9b-06. Date: 2026-11-03.

I changed no product code, test code or scripts. This report is the only file I added. The screenshots stay on the tester's machine (paths below) and are not committed.

> **Where this report lives:** the S9b-06 ticket asks for a "Re-test (S9b-06)" section inside `sprint-9-verification.md`. The coordinator asked for a separate file instead, so it is here. The Sprint 9 report is unchanged.

> **Independence note:** I am a separate tester agent. I did not write or review the Sprint 9b code, and I ran everything on my own stack: my own database, ports and browser scripts. However, the same coordinating agent wrote the tickets, directed the coding agent and briefed me. So this is not an independent review by a different person or team.

## Verdict: READY for a PR to main

All 17 findings and S9-05 are fixed. The gate is ALL GREEN, and every smoke scenario passes. There are no High or Medium findings, and nothing regressed in Sprint 9.

The attendance numbers are now real days:
- Two entries on one day count once.
- "All children" counts the days any child did school, and the label says so.
- A custom range counts only its own days, with a proportional share of the hours.

I checked every number by hand against Records and against `/api/log-entries`. I found 7 new Low findings (R1 to R7). None of them blocks a PR. R1 and R2 are about how the "Each entry" CSV reads next to the totals, so Will should know about them before a family hands a CSV to a state.

Numbers:
- **Gate:** `bash scripts/check.sh` came back **ALL GREEN** ("ALL CHECKS PASSED"). The steps are lint, typecheck, build, db:reset, test, test:tz and db:validate. Tests passed:

  | Package | Tests | Change since Sprint 9 |
  |---|---|---|
  | engine | 420 | 0 |
  | api | 1048 | +5 |
  | web | 1132 | +26 |
  | db | 141 | +1 |

  `test:tz` ran 420 engine tests in each of 7 zones: UTC, America/Chicago, America/New_York, Pacific/Auckland, Asia/Kolkata, Pacific/Kiritimati and Etc/GMT+12.
- **Findings re-checked:** **18 of 18 pass** (N1 to N17 and S9-05). Each fix comes with a test. The S9b diff adds or changes tests that name N6, N7, N9 to N17 and S9-05, plus API tests in `record-totals.test.ts` and `record-entries.test.ts` for N1, N2 and N8.
- **Smoke scenarios:** **23 of 23 pass.** In the first full run, 22 of 23 passed. `s2a-13-settings` timed out once, then passed on two re-runs (R7). The four scenarios that broke in Sprint 9 (`s2a-14-assignments`, `s2a-15-days-off`, `s2a-hardening` and `plan-debug`) now pass.
- **Browser sweep:** 70 screens, covering 7 screens × (4 widths × light and dark, plus high contrast at 360 and 1280). Nothing scrolls sideways (`scrollWidth - clientWidth` is 0 on all 70). axe found **0 violations** on all 70.
- **Tap targets:** only the 11 known Year bar badges are too small. This is the same as Sprint 9. The repo's `tap-targets` script gives 11 at 360, 11 at 320, and 11 at 320 with `TAP_EMAIL`. The calendar cells (N9) are now 44 px.
- **New findings:** 7, all Low (R1 to R7).
- **Flaky `timeline-add.test`:** **not seen.** It passed in the gate (10 tests, 3.3 s) and in 3 more runs on its own (10 of 10 each time, tests 2.6 to 2.7 s).

## Setup

- **Database and servers:** embedded Postgres 16 on 127.0.0.1, with scratch databases `hh9b_test` (for the gate) and `hh9b_dev`. The API ran on 127.0.0.1:3919 and Vite on 127.0.0.1:5919. There were no tunnels, nothing was exposed and nobody was contacted. The Vite port came from an untracked local config file, which I deleted before committing.
- **Browsers:** Chromium through Playwright, with axe-core injected. I also ran the repo's Puppeteer smoke scripts, pointed at the same Chromium with `SCREENS_DIR` outside the repo, so `docs/progress/screens` was not touched.
- **Families:**
  - The demo family (`demo@example.com`).
  - The second family from `scripts/smoke/seed-second-family.ts` (`smoke@example.com`: Frank and Margaret). I used it for everything that writes.
  - The empty family (`empty@example.com`).
  - I reset and reseeded `hh9b_dev` before the smoke run.
- **Dates:** "today" was the real Tuesday, 3 November 2026, so "this week" is Mon Nov 2 to Sun Nov 8. The Year runs Aug 31, 2026 to May 21, 2027. Thanksgiving week is a family day off in the seed.
- **Log setup:** a Detailed-style setup with:
  - hours by subject
  - core and non-core
  - school days
  - home and away
  - notes
  - books

  Math and Literature are core.
- **Screenshots and files:** screenshots are in `/workspace/hh-9b-test/shots/` (96 files) and `/workspace/hh-9b-test/smoke-screens/` (72 files). The CSVs, print PDFs, sweep JSON and scripts are in `/workspace/hh-9b-test/` and `/workspace/hh-9b-test/pw/`.

## Entries used for the hand checks (smoke family)

| Entry | Who | Dates | School day | Typed |
|---|---|---|---|---|
| A | All children (UI) | Mon Nov 2 to Fri Nov 6 | on | Math 3 h 30 m, Literature 2 h, note with accents and curly quotes, book Treasure Island |
| B | Frank (UI) | Tue Nov 3 | on | Science 1 h 15 m |
| C | Frank (UI) | Sat Nov 7 | **off** | Music 30 m; "Charlotte's Web" typed in the book box but **not** added |
| D | Frank (API) | Mon Nov 9 to Thu Nov 12 | on | Math 4 h |
| E | Margaret (API) | Tue Nov 10 to Fri Nov 13 | on | Math 4 h |
| F | Frank (API) | Mon Nov 16 to Fri Nov 20 | on | History 10 h |
| G | Margaret (API) | Mon Nov 23 to Tue Dec 1 | on | Art 2 h (Thanksgiving days off are inside the run) |
| H | Margaret (UI) | Wed Nov 4 | on | Math 45 m, home 30 m, note `=SUM(A1), "quoted", line` with a line break |

## Re-test results

| # | Sprint 9 finding | Fixed by | Result | Evidence |
|---|---|---|---|---|
| N1 | Second entry on the same day counted again | S9b-01 | **Pass** | Frank, This week (A + B + C): Records shows **5 school days, 7 h 15 m** (by hand: 5 + 3.5 + 1.25 + 0.5 h); `/api` totals give `days 5, total 435` min. Tuesday counts once. `n1-week-frank-360.png` |
| N2 | All children = max of one child | S9b-01 | **Pass** | Custom Nov 9–13 (D + E): All children **5**, labelled "days any child did school"; Frank 4, Margaret 4, each labelled "school days" in the per-child view. `n2-all-children-360.png` |
| N3 | Typed, not-added book dropped | S9b-02 | **Pass** | Entry C saved with `books: ["Charlotte's Web"]`; the book shows in the entry and in the CSV's Books read. `n3-typed-not-added-360.png` |
| N4 | "On track" under a late line | S9b-03 | **Pass** | Demo and smoke Home: "The Secret Garden will finish about 3 weeks late at this pace." and the Schedule card reads "This week and your year · 1 running late"; no "on track" anywhere on the page. The no-late wording is covered by `home-briefing.test.tsx`; I could not make a seeded family with nothing late in the browser without editing data, so that half is test-only. `home-demo-360.png`, `home-smoke-360.png` |
| N5 | Four smoke scenarios broken by the DateField | S9b-04 | **Pass** | All four now exit 0 (see Smoke). `s2a-15-days-off` deletes its test break and reports "plan back: true"; `s2a-hardening` "plan restored: true, errors: none". |
| N6 | Unticked "Last day" column; Totals CSV had no dates | S9b-05 | **Pass** | Export offers "Last day" as a column you can tick (ticked by default, per the decision in `sprint-9.md`). When no entry in the range is a run, it is dropped as empty (`csv-noruns-entries.csv`). The Totals CSV header is `From,To,Child,…` and its rows start `2026-11-02,2026-11-08`. |
| N7 | "0 m" for fields never typed | S9b-05 | **Pass** | Empty tiles show "—". The CSV drops columns that have no data (no "Hours away" column), and blank cells stay blank. In the print PDF, Frank has no "Hours at home" line, while Margaret's reads 30 m. `print-week-totals.pdf` |
| N8 | Range held entries only by their first day | S9b-01 | **Pass** | Custom Wed Nov 18 to Thu Nov 19 inside F (Mon–Fri, 10 h): **2 days, 4 h** (2/5 of 10 h), and the list says "part of an entry from Nov 16 to Nov 20". The API agrees. `n8-partial-range-360.png`. Days off inside a run are handled too. G (Nov 23 to Dec 1, Thanksgiving off) has 2 school days (Nov 30 and Dec 1), and a range from Nov 23 to Nov 30 gives 1 day and 1 h of its 2 h. |
| N9 | 320 px: calendar cells, h/m boxes, wrapping, placeholder | S9b-05 | **Pass** (R6) | At 320, 360, 390 and 1280 px, light and dark, every calendar day cell is at least 44 × 44. At 320 the calendar spans x = 4 to 316. The h and m boxes are 44 px tall on one line, and "142 h 5 m" fits. Big totals ("33 h 30 m") do not wrap at any width. The placeholder clears the icon at every width, though at 360 it is tight (R6). `n9-calendar-320-light/dark.png`, `n9-log-form-hours-320-*.png`, `n9-date-placeholder-*.png` |
| N10 | Reset button name mismatch | S9b-05 | **Pass** | The visible text is "Reset to default" and the accessible name is "Reset to default: Fall". axe is clean on Edit zoom views. `n10-edit-zoom-views-360.png` |
| N11 | Long term names, no edge cue | S9b-05 | **Pass** (R4) | A 30-character name is cut to "Autumn term at …" (text 259 px in a 160 px chip). The `title` holds the full name, and the row has a mask fade at the scrolling edge. At 320 the fade is the only sign that Spring and This month are off-screen (R4). Reset restored "Fall". `n11-30char-term-320.png`, `n11-30char-term-320-scrolled.png` |
| N12 | No children: Log form with nobody to pick | S9b-05 | **Pass** (R5) | The empty family, after picking Days attended, sees "Add a child first: each entry in your log is for a child." with a link to `/setup/children` and no Log button. `n12-no-children-360.png` |
| N13 | Spring end differed between screens | S9b-05 | **Pass** | Edit zoom views and Records both show Spring as Jan 1 to May 21, 2027, and Fall as Aug 31 to Dec 31, 2026. |
| N14 | No BOM | S9b-05 | **Pass** | All 4 downloaded CSVs start `ef bb bf` (`od -tx1`). Accents and curly quotes come through as UTF-8. `=SUM(A1)` exports as `'=SUM(A1)`, and commas, quotes and line breaks are quoted. The file name is `records-2026-11-02-to-2026-11-08.csv`. **I did not open the files in Excel, which is not available on the test machine.** The bytes are right, but I have not confirmed how Excel displays them. |
| N15 | Link style; school day not a switch | S9b-05 | **Pass** | The state-laws link uses `btn-link` in the accent colour: rgb(63,107,92) light, rgb(156,203,184) dark. "Count as a school day" is a `role=switch`, 44 × 26. In forced colours it falls back to a native checkbox with system colours, which is what the decision says. `n15-setup-switches-360-light.png`, `sweep-setup-*-contrast.png` |
| N16 | Switch-off entry looked like a school day | S9b-05 | **Pass** | Entry C's summary reads "Not counted as a school day · Music 30 m · 1 book", both on screen and in print. |
| N17 | Undo lost the range and child | S9b-05 | **Pass** | Starting from Frank + Custom dates Nov 9–13, I deleted an entry and pressed Undo. The URL still has `range=dates&from=2026-11-09&to=2026-11-13&child=…`, Frank and Custom dates are still pressed, and the fields read Nov 9, 2026 and Nov 13, 2026. A reload keeps all of it. `n17-after-delete-390.png`, `n17-after-undo-390.png` |
| S9-05 | Demo family showed no briefing line | S9b-05 | **Pass** | The demo seed now has The Secret Garden forecast about 3 weeks late. Home shows the line with Review, and the Schedule card says "1 running late". `home-demo-360.png`. The empty family sees Getting started and no line (`home-empty-360.png`). |

## New findings

| # | Severity | Area | Finding |
|---|---|---|---|
| R1 | Low | Export (Each entry) | Adding up the "School days" column in the entries CSV can give more than the real total. Frank's This week rows are 5 + 1 + 0 = 6, but Records and the Totals CSV say 5, because the Tuesday is in two entries. Nothing in the file says the per-row figure is not additive. A parent who sums the column in a spreadsheet gets the old N1 number back. Options: a note line, or use the Totals CSV for the count. |
| R2 | Low | Export (Each entry) | When a run is clipped to the range (custom Nov 18–19 inside the Nov 16–20 entry), the CSV row shows the clipped dates and hours (2 days, 4 h). Unlike the screen, it doesn't say "part of an entry from Nov 16 to Nov 20", so the file and the screen read differently. `csv-n8-entries.csv` |
| R3 | Low | Records / Schedule at 320 px | The "All children" option in the child switch wraps onto two lines at 320 px on Records and Schedule. The log form's "For" chips don't wrap. This is probably older than Sprint 9b, but it shows in every 320 screenshot. `sweep-records-year-320-light.png` |
| R4 | Low | Zoom row at 320 px (N11) | With a long Fall name, the only sign that Spring and This month are off-screen is a 32 px fade over the "…". It works, but it is weak, and a parent may not know the row scrolls. |
| R5 | Low | Records, no children (N12) | The message reads "Your log tracks School days." with a capital "S" in the middle of a sentence (the field label is used as-is). |
| R6 | Low | Date field at 360 px (N9) | The placeholder "Choose a date" ends about 1 px before the calendar icon (text ends ~131 px, icon at ~130 px by canvas measure). In the screenshot it looks clear, but it has no margin. |
| R7 | Low | Smoke scripts | `s2a-13-settings` timed out once (waiting 15 s for `/setup/settings` after logging in) when run straight after `axe-2a` in the full run. It passed in 2 re-runs by itself. This is a flaky scenario, not an app fault as far as I can tell. |

No High or Medium findings.

## Sprint 9 regressions: none found

- **Navigation (S9-01):**
  - The tabs read Home, Schedule, Records at every width and theme. Home has the Schedule and Records cards.
  - The redirects still work and keep the query:

    | From | To |
    |---|---|
    | `/track` | `/schedule?view=week` |
    | `/track?week=2026-10-19` | `/schedule?week=2026-10-19&view=week` |
    | `/timeline` | `/schedule?view=year` |
    | `/timeline?zoom=month` | `/schedule?zoom=month&view=year` |
    | `/kids` | `/setup/children` |
    | `/schedule/settings` | `/setup/settings` |
- **US date field (S9-04):**
  - The field reads "11/9/2026", "Nov 10, 2026" and "2026-11-11" (→ "Nov 11, 2026").
  - "13/45/2026" and "11/9/26" leave the last good date, and an empty field clears.
  - I found no ISO date, "2 Nov" or `mm/dd/yyyy` text, value or placeholder on Home, Records, Week, Year, Days off, Assignments or Family settings.
- **Renamable terms (S9-06):** Fall renamed to a 30-character name showed in the zoom row and on the Records chips with the same dates. Reset to default brought back "Fall" and its dates.
- **Records log (S9-07):**
  - The Log form opens with nothing prefilled: no filled boxes, no child pressed, only the school-day switch on.
  - Validation is intact: 25 h gives "Hours can't be more than 24 a day (24 hours for this day).", and 75 minutes gives "Minutes are 0 to 59."
  - Logging does not change the plan. I compared `/api/assignments`, `/api/check-ins/weeks`, `/api/children`, `/api/events`, `/api/blocked-ranges`, `/api/plan` for the whole year and `/api/plan` for this week. All were **IDENTICAL** after a create and again after a delete. (`/api/week-overrides` needs a `weekStart`, so the week plan stands in for it.)
- **Totals, CSV and print (S9-08, S9-11):**
  - The totals match my hand counts (table above).
  - The CSV still writes only the ticked columns, drops empty columns and escapes formulas.
  - The S9-08 wording is still the first line of every CSV.
  - Print gives one page per child: 2 pages for 2 children (`pdfinfo` on `print-week-totals.pdf` and `print-week-entries.pdf`).
- **"Together group":** nothing by that name exists in the code or docs, so I could not test it under that name. I checked the nearest thing, Schedule · Week grouped per child ("Frank's work", then Margaret), at every width. It is unchanged. If "Together group" means something else, it still needs a check.

## Smoke scenarios

`scripts/smoke/flow.mjs <scenario>` was run against 127.0.0.1:5919, using `SMOKE_EMAIL=smoke@example.com` for the scenarios that write. The database was reset and reseeded first.

Full run, 22 of 23 exit 0:
- `auth`
- `axe-2a` (clean; it logs the two expected 401s from signing out)
- `axe` (clean on every screen)
- `edge`
- `engine-version`
- `full-flow` ("PROBLEMS: none")
- `kids-add`
- `kids-edit`
- `kids-list`
- `login`
- `plan-debug`
- `records` ("PROBLEMS: none")
- `s2a-12-hub`
- **`s2a-13-settings` (timed out; passed on 2 re-runs, R7)**
- `s2a-14-assignments`
- `s2a-15-days-off`
- `s2a-16-events`
- `s2a-17`
- `s2a-hardening`
- `subjects-add`
- `subjects-edit`
- `subjects-list`
- `tap-targets` (11 undersized, all Year badges)

`tap-targets` also gives 11 with `TAP_WIDTH=320`, and 11 with `TAP_WIDTH=320 TAP_EMAIL=smoke@example.com`.

## Browser sweep

- **What was covered:** 7 screens:
  - Home
  - Schedule Week
  - Schedule Year
  - Records (Year)
  - the Log form with its calendar open
  - Export
  - Log setup

  Each was checked at 320, 360, 390 and 1280 px in light and dark, plus high contrast (`forced-colors: active`) at 360 and 1280. That is 70 screens.
- **Sideways scroll:** none.
- **axe:** 0 violations on all 70.
- **Small targets:**
  - The 11 Year bar badges (24 px tall, older than this sprint).
  - The 22 px native checkboxes and radios on Export and Log setup, where the whole label row is the real target.
  - The inline state-laws link, which is exempt as inline text.
  - In 360 dark and contrast, the "×" close button measures 44 × 44 but is flagged because of sub-pixel rounding. It is not a real failure.
- **Screen tests (DESIGN_DIRECTION):**
  - **Five seconds:** Home passes, with one late line, two cards and Getting started for a new family.
  - **One job and words:** Records has one job (Log, with totals and Export secondary). The labels now say what a number means ("days any child did school").
  - **Duplicates:** none new.
  - **Empty states:** a family with no children gets "Add a child first" (N12), and a family with nothing logged gets "Nothing logged yet."
  - **Phone first:** 360 works one-handed, and 320 has only R3 and R4.

## What Will should look at first

1. **Records → Custom dates, Wed to Thu inside a Mon–Fri entry** (`n8-partial-range-360.png`). Two days, and two fifths of the hours. This is the coordinator's default for splitting hours (S9b-01 step 4), so confirm you are happy with it.
2. **Export → Each entry, then add up the School days column** (R1). The totals file is right. The per-entry file adds up to more, because a day in two entries appears in both rows.
3. **Home with The Secret Garden running late** (`home-demo-360.png`). The line and the card now agree.
