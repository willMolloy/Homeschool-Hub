# Sprint 16 verification (Week as Days, clearer Records, book suggestions)

This is the tester pass for Sprint 16, ticket S16-04. It covers S16-01, S16-02, S16-03, S16-05 and S16-06 (commits 3400621..7afa4a3, with main merged in at 7753667) on branch `claude/sprint-16-week-days`, tested at the tip 7753667. Date: 2026-11-05 (the machine's date, and the app's "today" for America/Chicago).

I changed no product code, test code or scripts. This report and eight small screenshots in `docs/reviews/sprint-16/` are the only files I added. (I briefly made a one-line copy of the `term-review` scenario to see what else it checks, then deleted it; the tree was clean apart from these files.)

> **Independence note:** I am a separate tester agent and did not write the Sprint 16 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: READY for Will's look, with one smoke script to fix first (0 High, 2 Medium, 3 Low findings, 4 notes)

Days is faithful to paper. Across 12 weeks, three child choices each and two families (about 70 week-and-child comparisons, including breaks, a one-child day off and a finished book), every Days line (child, day, title, range) equals the printed `/print/week` sheet's row, with no differences. The layout, toggle, viewer read-only behaviour, book suggestions, the Records numbers and the CSV all behave as the tickets say.

The two Mediums: the `term-review` smoke scenario now fails (it still expects the old "BOOKS READ" label, N1), and on a phone a "Keep going: Chapter 19" range is cut to "Keep going: Chapte…", which hides the number the line exists to show (N2). The Lows are a "0 school days" card that breaks the "never a zero" rule for one child (N3), Term in review showing two overlapping finished lists (N4, the duplication you asked me to judge), and the print summary leaving out Books finished unless "Totals" is chosen (N5).

## Numbers

- **Gate:** `scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate), run once, first, on a clean tree, log in the scratchpad `check.log`.

  | Package | Tests |
  |---|---|
  | engine | 437 (and 437 in each of the 7 `test:tz` zones) |
  | api | 1189 |
  | web | 1616 |
  | db | 180 |

  These match the developer's S16-03 counts exactly.
- **Tickets:** 5 of 5 built tickets pass their "Done when" (S16-01, 02, 03, 05, 06), two with a Low or Medium finding attached (S16-05, S16-03's smoke). S16-04 is this report.
- **Smoke:** one full round, 32 runs (31 scenarios plus `tap-targets` again at 320 px with `TAP_WIDTH=320`), re-seeding the database before each except `kids-edit`. **31 exit 0, 1 exit 1:** `term-review` (N1). `days` says "PROBLEMS none"; `view-only`, `accounts`, `full-flow`, `new-family` and `records` say "PROBLEMS: none"; `sheets` and `completion` say "ok"; both `tap-targets` runs say "No undersized controls on the listed screens." After patching only the one label in a throwaway copy, `term-review` also passes ("ok"), so the label is the only thing wrong.
- **My own checks:** about 110 Days page states (below), four Records and book-form sweeps with axe and tap targets in both themes, and scripted browser flows on the toggle, the viewer, the CSV, the print summary and the keyboard. Findings: 0 High, 2 Medium, 3 Low (N1 to N5), 4 notes (N6 to N9).

## Setup

- Postgres 16 (role hh/hh). A scratch database `hh16_dev` was made, seeded with `db/demo.ts --no-serve` and `seed-second-family.ts`, **and dropped at the end** (only `hh_dev` and `hh_test` remain).
- API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173 only, both stopped afterwards. Nothing was exposed and nobody was contacted. Nothing installed.
- Browser: Playwright's Chromium (`/opt/pw-browsers/chromium-1243`); `CHROME_PATH` pointed at it for the smoke scripts.
- Because the demo family cannot be changed, I built my own busy week in the `smoke@example.com` family through the real API: Frank off Tue Nov 10 ("Dentist"), Margaret off Thu Nov 12 ("Co-op trip"), a 40-chapter book with a very long title for both children, and, for Records, a shared book finished Oct 20 (chapters), a finished lessons assignment, a stopped reading assignment, a finished-then-archived reading assignment, a Frank-only book finished Nov 3, a detailed log set-up and six entries (some with "treasure island " and "Treasure  Island" to test the de-duplication).

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S16-01 The Days view | **Pass** (N2) | Matches the printed sheet in every week compared. Phone stacks; 840 px and up is columns; no sideways scroll. Details below |
| S16-02 Toggle and markers | **Pass** | Bars default, remembered, `?layout=` works, markers only under All children. Details below |
| S16-05 Records cards | **Pass** (N3, N4, N5, N8) | Per-child days, books finished and the mentioned list are right; CSV and Term in review agree with Records. Details below |
| S16-06 Book suggestions | **Pass** | "trea" offers Treasure Island, recent row, keyboard, never prefilled, 320 px. Details below |
| S16-03 Screenshots, docs, smoke | **Pass** (N1) | The `days` scenario exits 0 against my stack; the screenshots show a real busy week. But the `term-review` scenario is stale (N1) |

### S16-01 Days, in detail

- **Equals the printed sheet.** For each of 12 weeks (Oct 19 to Feb 1, including Thanksgiving and Christmas break weeks) I read every `.day-line` (child from the screen-reader name, day, title, range) and every row of `/print/week` for Frank, for Margaret and for All children, and compared them as sorted lists: **identical every time** (for example the week of Nov 2: Frank 25 lines, Margaret 21, All 46; all three sets equal). I repeated it for my own family with the extra long-titled book and two days off (weeks Nov 2, 9, 16, 23: identical; All children 54, 44, 54 and 0 lines). Whole-unit ranges ("lessons 42–43", "Keep going: Lesson 41", "chapter 19") are the sheet's own.
- **Widths.** For 320, 360, 390, 839, 840, 1000 and 1280 px, in light and dark, four weeks (a normal one, the days-off week, Thanksgiving, and an empty week in Sept 2027), one child and All children: 112 states, **no sideways scroll in any**, axe clean, no control under 44 px. At 360 and 839 the five days stack (one per row); from **840 the five days sit side by side in one row** (columns 134 px at 840, 166 at 1000, 222 at 1280). The page is widened from 840 for Days so columns are not squeezed.
- **Load bars, days off, nothing planned.** The bar in each day header shows the shape of the week with no number (Tue Nov 10 is a short bar when Frank is off). A day off for one child under All children is a quiet "Frank · Dentist" / "Margaret · Co-op trip" line under the other child's work (screenshot `days-off-lines-360-light.png`). A whole-family break is one line on each day ("Thanksgiving break" on all five days of Nov 23 to 27, "Christmas break" Dec 21 to 25). The empty Sept 2027 week shows "Nothing planned" on all five days.
- **Tapping a line.** A parent's tap opens the week adjustment for that child (rows with That week, minus and plus, Update status); it makes no request but GETs. On a past (finished) week a parent's tap opens "How did it go? As planned, Got ahead, Fell behind" (Update status), as the Bars do. A viewer's tap opens a read-only detail whose only button is Close ("Math 5, Math · Frank, Dates, Amount, About 1 lesson a day"); the same on a past week.
- **Rules after an assignment ends.** Hatchet (finished Nov 3) has lines on Nov 2 and 3 only in the week of Nov 2, and none after; this equals the sheet.
- **Where it is not perfect.** N2 (range cut on phones) and N9 (a tap does not point at the tapped assignment).

### S16-02 Toggle, in detail

- **Default and memory.** A fresh browser shows Bars (pressed) and no Days. Clicking Days sets `hh.week.layout=days` and `?layout=days`; a reload with no parameter keeps Days; the layout stays when the week arrows, the child, or Week then Year then Week are used.
- **`?layout=`.** `?layout=bars` beats the saved Days (and does not overwrite the saved choice); `?layout=junk` falls back to the saved one.
- **Size.** Both buttons are 72 x 44 px, in their own row under the Week header (not beside the arrows; the developer explains why). No control under 44 px.
- **Markers.** All children: one initial in the child's colour per line (44 lines at once in my busy week, each with the child's name for screen readers). One child picked: 0 markers.
- **Blocked storage** (`localStorage` throws): the page renders, the toggle is there, zero page errors; it just does not remember.
- **Viewers** get the toggle (Bars default, two buttons), Days, markers under All children, a read-only detail, and made **no non-GET request**; the GETs were the allowed ones (me, plan, events, children, subjects, assignments, blocked-ranges, check-ins). No sideways scroll at 320, 360, 390, 840 or 1280.

### S16-05 Records, in detail (my family's data, All children, Year)

| Measure | Expected | Seen |
|---|---|---|
| School days, Frank / Margaret | 5 / 3 | "Frank 5, Margaret 3" |
| School days, This week (Nov 2 to 8) | Frank 3, Margaret none | "Frank 3, Margaret —" |
| School days, Spring (nothing logged) | none for both | "Frank —, Margaret —" |
| "any child" wording | gone | gone from Records, CSV and print summary |
| Books finished, All children | Aesop, Treasure Island (pages), Treasure Island (chapters, shared), Hatchet = 4; the finished lessons assignment, the stopped one and the archived one are not counted | **4** |
| Books finished, Frank / Margaret | 4 / 1 (the shared book is one book for All children) | 4 / 1 |
| Books finished, This week | Hatchet only | 1 |
| The finished list (tap the card) | titles with dates | "Aesop's Fables Sep 11, Treasure Island Oct 2, Treasure Island Oct 20, Hatchet Nov 3", also for a viewer, no write |
| Books mentioned | a list, no count card | "Books mentioned in your log: treasure island, Charlotte's Web, Hatchet" (the "treasure island " and "Treasure  Island" entries collapsed to one) |

- **Term in review** (Year, All children, Frank's card): 5 school days, 5 finished, 4 books finished; the lists FINISHED (5 titles, includes the finished lessons assignment) and BOOKS FINISHED (4 titles). Same numbers as Records.
- **CSV** (Totals file): `Frank,5,4,4,"Aesop's Fables; Treasure Island; Treasure Island; Hatchet","treasure island; Charlotte's Web; Hatchet"` and `Margaret,3,1.5,1.5,Treasure Island,...`. Columns "Books finished" and "Books read" are separate; the Each entry file has no Books finished column. **Same definitions as Records and the card.**
- **Sweeps:** Records (All, Year), the finished sheet, the log form with suggestions, Term in review and Days, at 320, 360 and 1280 px in light and dark: axe clean, no sideways scroll, no control under 44 px. The only "small" hit is the "Count as a school day" checkbox in the log form (44 x 26), which the smoke rule measures as its label, so fine.
- **Duplication judgement (the FINISHED and BOOKS FINISHED card):** yes, it reads as duplication. In the screenshot (`term-review-two-lists-360.png`) three tiles say "5 school days, 5 finished, 4 books finished", then two lists repeat the same four book titles side by side. A parent will wonder what the difference is. I would keep only one of the two (see N4).

### S16-06 Suggestions, in detail (log form, Frank picked)

- The books field **is empty when the form opens** and stays empty when a child is picked, when the Recent row appears, when a title is added and when the form is reopened. Only a tap or Enter adds anything.
- Typing **"trea" offers "Treasure Island"** (once, though it is in two assignments and two log entries). "hatc" offers "Hatchet". "zzzz" offers nothing and `aria-expanded` is false.
- **Recent row:** under the empty field for Frank: "Hatchet, treasure island, Charlotte's Web" (newest first); no row until a child is picked; adding a title removes it from the row (case-insensitively). Each chip is 44 px high.
- **Keyboard:** ArrowDown/ArrowUp move the highlighted option (wrapping), Esc closes the list only (the sheet stays), ArrowDown reopens it, Enter on a highlighted option adds it, Enter on typed text adds exactly what was typed ("Made Up Title"). Nothing was written to the server while testing.
- **320 px:** option 193 x 44, chips 44 high, no sideways scroll (`book-suggestions-320.png`). The list opens over the Save/Cancel buttons while typing; they come back when it closes, so it only crowds, it does not block.

### S16-03 and the "too full?" judgement

I looked at the six developer screenshots in `docs/progress/screens/sprint-16/` and at my own busy two-child week at 360 and 1280 px (`days-two-child-busy-360-light.png`, `days-two-child-busy-1280-dark.png`).

- **1280 px: not too full.** Five calm columns of about 222 px; the busiest day (13 lines) is about one and a half screens; the titles, icon, range and initial all read; the load bar and the quiet "Frank · Dentist" line are light. With two children and 46 to 54 lines for the week it is full, but it is orderly (Frank's lines then Margaret's, a colour bar per subject).
- **360 px: long, but scannable.** The same week is about 2,900 px tall, roughly four screens. Each line is one row of 44 px, so the page is a list, not a wall. What makes it long is that each day repeats both children's six to seven lines. If Will finds it too long on his phone, the better lever is one child at a time (it is already one tap), not changing the layout. The one thing that hurts at 360 is N2.
- **What I did not see as a problem:** the load bar as decoration (it is the same everywhere there is work), icons (they are the Bars' own), initials (20 px, colour plus letter, so not colour alone).

## Findings

**N1 (Medium): the `term-review` smoke scenario fails after S16-05.** Steps: seed, `cd scripts/smoke && node flow.mjs term-review` (as in the S16-03 round). Result: exit 1, "PROBLEM: the card lacks time by subject or books", because `scenarios/term-review.mjs` line 74 still checks for "BOOKS READ" and the card now says "BOOKS FINISHED" (S16-05 changed that label and its web tests, but not this script). The product is right: with the label changed in a throwaway copy the whole scenario passes ("term-review scenario: ok", Print and Save image, axe, 44 px). The developer's S16-03 progress note lists only `days` as a Sprint 16 smoke result, so this was probably never re-run. Fix: change the string in the scenario. Until then the "run every scenario" round is red.

**N2 (Medium): on a phone, a range like "Keep going: Chapter 19" is cut to "Keep going: Chapte…", hiding the number.** Steps: demo family, Schedule, Week, Days, 360 px, Frank, week of Nov 2. Result: Mon "The Hobbit ... Keep going: Chapte…"; Tue "Math 5 ... Keep going: Lesson 41" and many others are cut the same way (`.day-range` is `max-width: 45%` with one line and an ellipsis; `days-two-child-busy-360-light.png`). The printed sheet and the wide columns show the full text; only phones lose it, and "Keep going" lines are common (every slower book). Short ranges ("lesson 44", "lessons 7–8") are fine. The unit number is the point of a line, so a parent can't see which lesson to do without tapping. A fix could let the range wrap under the title, as the wide layout already does, or give the range priority over the title's width.

**N3 (Low): a single child with nothing logged in the range still shows "0 school days" (next to "—" in total).** Steps: Records, pick Margaret (a child with no entries this week), This week. Result: a card "0 school days" and "— in total" and "Nothing logged in these dates." (`records-zero-school-days-360.png`). Under All children the same child shows "Margaret —" correctly, so the two views disagree, and the brief's "—, never a zero" and S16-05 step 5 are only half met. This is old behaviour (the single-child card shows the API's number), not new, but it is the one remaining zero on the card.

**N4 (Low, design): Term in review shows both FINISHED and BOOKS FINISHED, which reads as duplication.** Steps: Records, Term in review, Year. Result: tiles "finished" and "books finished" and two lists that repeat the same titles (`term-review-two-lists-360.png`); a finished lessons assignment ("Fractions unit") is in only the first. The progress doc already flags it. My view: pick one list. Either keep FINISHED (all finished work, with a small mark on reading ones) and drop the "books" tile and list, or the reverse. It also repeats a title if two assignments share one (see N7).

**N5 (Low): the print summary has "Books finished" only when "Totals" is chosen.** Steps: Records, All children, Year, Export, leave "Each entry" selected, Print summary. Result: Frank's page lists "School days 5, Math 4 h, Total hours 4 h, Books read treasure island; Charlotte's Web; Hatchet" and no Books finished line, though Records and the card show 4. With "Totals" chosen the line is there. It matches the CSV (the Totals file only), and S16-05 step 4 says the print summary gets the line, so someone printing the default will not get it. Also a child with no typed books prints "Books read: None".

**Notes (not defects):**

- **N6:** the single-child school-days card and the per-child numbers agree with the helper in every case I tried (Frank 5, 3 this week; Margaret 3, none).
- **N7:** two different assignments with the same title are counted and listed separately ("Treasure Island" pages and "Treasure Island" chapters are 2 books in the sheet, Records and the card). That follows the definition (one book is one assignment, a shared one is one), but the demo data makes it visible.
- **N8:** a finished reading assignment that is later archived leaves the Books finished count and list (I archived one to test; it vanished). That follows "non-archived" in the definition; Will may prefer that archiving a book does not erase its finish.
- **N9:** a tap on a Days line opens the week adjustment for that child with all of that child's assignments, in the sheet's order; the tapped assignment is not highlighted or scrolled to. It is the same as tapping a bar, so it is as specified.

## What Will should look at first

1. **Days on your phone, in the busiest week (N2).** Open Schedule, Week, Days at phone width and look at the "Keep going" lines. Decide how you want those ranges to show.
2. **The overall feel of Days on both screens.** Look at `days-two-child-busy-360-light.png` and `-1280-dark.png` first; this is the "too full?" question and my view is "fine on a laptop, long but tidy on a phone".
3. **Term in review's two finished lists (N4).** Open it for a child with finished books and say which list you want.
4. **The zero on a one-child Records card (N3) and the print summary (N5)**, then the smoke fix (N1), which is one string.

## Screenshots (`docs/reviews/sprint-16/`)

| File | Shows |
|---|---|
| `days-two-child-busy-1280-dark.png` | A two-child week with a Dentist day off and a Co-op trip at 1280 px, dark: five columns, initials, load bars, the quiet lines |
| `days-two-child-busy-360-light.png` | The first day of that week at 360 px, light: the range cut to "Keep going: Chapte…" (N2) |
| `days-off-lines-360-light.png` | The next day at 360 px: a short load bar and "Frank · Dentist" |
| `viewer-days-detail-360.png` | A viewer's tap on a Days line: read-only detail with only Close |
| `records-cards-360.png` | Records, All children, Year: "Frank 5, Margaret 3", 4 books finished, a Books mentioned list |
| `records-zero-school-days-360.png` | Margaret, This week: "0 school days" beside "—" (N3) |
| `term-review-two-lists-360.png` | The Term in review card with FINISHED and BOOKS FINISHED side by side (N4) |
| `book-suggestions-320.png` | The log form's books field at 320 px with "trea" offering Treasure Island |
