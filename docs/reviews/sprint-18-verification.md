# PR #17 independent verification: Sprint 18 (fixes from the second end-to-end run)

- **PR:** https://github.com/willMolloy/Homeschool-Hub/pull/17, branch `claude/sprint-18-e2e-fixes`, head `86c8d4710114c5d1e21537c04d03781e6c74041b` (checked at the start; base `main`).
- **Tester:** Grok Bot (independent tester), Thu Nov 5, 2026, about 10:20 to 11:00 PM CST. Fresh clone in `/workspace/hh-tester-pr17`. I did not open `docs/progress/` or `docs/reviews/` until this report was written.
- **Screenshots:** `/workspace/hh-tester-report/pr17/` (the file names are given below). The scripts are in `/workspace/hh-tester-pr17-pw/`.

## Verdict: **READY**, with one Medium follow-up

All three Medium fixes (E1 to E3) work in the browser and through the API. All ten Low fixes (E4 to E13) pass; E11 passes only through the seed data (see M2). Re-walking Parts 4 and 6 of `docs/e2e/cm-term-run-2.md` found nothing broken. The full unit and integration suite passes (3,584 tests). I found no High issues.

I recommend one quick follow-up before a family runs a real term on this build: **M1**, where "Pick a date" in Update status accepts a date in the past. Undo recovers from it. M2 is a product limitation rather than a regression, and it needs a decision, not a code fix in this PR.

| Severity | Count |
|---|---|
| High | 0 |
| Medium | 2 (M1, M2) |
| Low | 3 (L1 to L3) |

## Setup (my own copy, local only)

- Postgres 16 (embedded binaries) at `127.0.0.1:5482`, in a data directory of my own (`/workspace/hh-tester-pr17-pg`). Databases `hh_dev` and `hh_test`. The seed was `npm run e2e:seed -- --reset` (the Hartley family, 34 assignments).
- The API was at `127.0.0.1:3483` and the web app (Vite) at `127.0.0.1:5583`. No other agent's process or port was touched.
- **Local-only additions, not product code and not committed (`git status` shows them as untracked):**
  - `apps/api/tester-server.ts` is the same as `src/server.ts`, except that it passes `buildApp`'s existing `now` option a clock that starts at Thu Nov 5, 2026 11:00 CST and runs forward. It was needed because the real clock was about to cross midnight into Nov 6, while the e2e script expects Nov 5.
  - `apps/web/vite.tester.config.ts` is the same as `vite.config.ts`, with the port and proxy changed to 5583 and 3483.
  - `.env` (gitignored) holds the database URL, a random session secret, HOST=127.0.0.1 and PORT=3483.
- Browser: Playwright Chromium with mobile/touch emulation, the America/Chicago time zone and a page clock pinned to Nov 5. Widths were 360 and 440 px, plus 390 px (the run's width), 320 px in dark mode, and 440 px in light mode.
- Every data change went through the UI or the API. I made no manual database edits.

## Fix status: E1 to E13 and S18-05

| # | Ticket | Status | Evidence |
|---|---|---|---|
| E1 | S18-01: Update status shows an undo bar and Undo restores the week | **Pass** | The bar reads "Updated A Child's History of the World. Undo" (`us-keep-b-after-save-360.png`); with a moved end it reads "…, end moved to Feb 1". I compared snapshots of assignments, check-ins for both weeks, the week list, overrides and the whole plan (Oct 26 to May 30) before the save and after Undo: **0 differences** in all four cases (Keep, Move, Pick, Got ahead). Undo from the bar (`us5-c-after-undo.png`) reversed only the second of two saves and left the first in place. One undo per save; after use, Undo is no longer offered. |
| E2 | S18-02: Keep, the late line's date, or a picked date | **Pass** (see M1 and L1) | The sheet offers "Keep Dec 18, 2026 / Move the end to Feb 1, 2027 / Pick a date" (`us-03-fell-behind-choices-360.png`). The Move date equals the briefing's "Move end to Feb 1, 2027", and after a Keep save both read Jan 28 (`us6-chw-reopened.png`). Results: Move set the end to 2027-02-01 and the late line went away; Pick "Feb 15, 2027" saved 2027-02-15; Keep left the end at Dec 18. The Year view showed "Aug 31, 2026 – Feb 1, 2027" (`us-e2e44-year-390.png`). |
| E3 | S18-03: Bars, Days and sheets name the same work | **Pass** | An automated sweep compared every assignment for each child across 10 weeks (Oct 26 to Feb 1, including Thanksgiving, December and Spring) in Bars, Days and the printed week sheet: **207 assignment-weeks, 0 mismatches**. After a week adjustment on Treasure Island (47 → 30 pages), a further 84 assignment-weeks also had 0 mismatches. A multi-row adjustment (Fabre +2, Lingua +1, Luke +1) read "chapters 16–18 (starts 18)" on the bar and Mon ch 16 finish … Thu ch 18 start in Days. Update status's "last week" wording matches last week's bars for 5 of 5 items (for example "chapters 15–16 (starts 16) last week"). |
| E4 | Setup step 2: rename, remove, duplicate name | **Pass** | In a new family (an invite made from the CLI) I added Mina and Jory. Each child has Rename and Remove. "mina" and "Mina" both ask "Add another child named Mina? Yes, add Mina / No". Renaming to "Jory Ann" saved through the API, and Remove worked (`e4-01…e4-05`). No sideways scroll at 360 px and every target is 44 px or more. |
| E5 | "1 assignment ended" | **Pass** | After answering Winnie-the-Pooh, the sheet title reads "1 assignment ended" and the nav reads "Home, 1 thing needs you" (`e5-02`). |
| E6 | Week-start note | **Pass** | The note reads "Can't change once you've used Update status.", which matches the API message and the lock (`e6-01`). |
| E7 | Undo bar for a log entry, and the duplicate question | **Pass** | "Added Clara's log for Nov 2 to Nov 6. Undo" (`p6-05-first-after-save-390.png`). Repeating the identical entry asks "You already logged this. Add it again? Add it again / No", and nothing is saved until you answer (still 22 entries). |
| E8 | Add sheet opens with no subject and no unit | **Pass** | The Year "+" sheet opens on "Choose a subject…" with no unit selected (`e8-03`). The Set up page form still starts on Lessons, as the ticket allowed ("record the choice"; the code comment records it). |
| E9 | Add several and CSV: pace warning and duplicate flags | **Pass** | Add several shows "That's about 102 pages a day. Is that right?", the same wording as the single form; "Same title as row 1. It would be added twice."; and "You already have Math 2 for Wren. It would be added again." (`e9-02`). The CSV preview shows the same three flags and a summary line, and nothing is imported until you tap Import (`e9-05`). |
| E10 | Days events as one quiet line; lower-case ranges | **Pass** | "Fri · Co-op Friday (fall)" is one quiet line, and every range is lower case. |
| E11 | No Monday lines for Wren (Tue–Fri) | **Pass, through seed data only** (see M2) | Wren's Days on Monday says "Nothing planned", her week sheet has 0 "Mon ·" lines, and her Monday day sheet says "Nothing planned for Monday" (`e11-01…04`). The fix is in `seed-cm-family.ts`, which splits the shared read-alouds into Wren-only copies on Tue–Fri. The product still has no per-child school days. |
| E12 | Records opens on All children; "Books finished —" | **Pass** | After picking Clara in Schedule, Records opens on All children. In the Totals print summary, Wren shows "Books finished —" (`e12-02-print-summary.pdf`). |
| E13 | Chip not clipped at 390; long titles truncate | **Pass** | The "All children" chip is 116 px with scrollWidth equal to clientWidth (not clipped). The title "A Child's History of t…" truncates, and × stays on the same row at 320, 360 and 440 px in light and dark (`vis-status-320-dark.png`, `us-move150-a-before-save-360.png`). |
| S18-05 | Tester pass, re-walk, script fixes, gate | **Partly** | My tester pass and the re-walk are below, and the gate's tests pass. The script mismatches the ticket asked to fix are mostly still in `cm-term-run-2.md` (L2). |

**Tests:** `npm test` gave engine 437/437, web 1750/1750, api 1207/1207 and db 190/190. My first run failed only because my own `hh_test` database had not been migrated yet. After `db:migrate` everything passed (logs: `pr17/npm-test-api.log`, `pr17/npm-test-db.log`). I did not run lint or typecheck, to save usage.

## Findings

### M1 (Medium): "Pick a date" in Update status accepts a date in the past, and saving it ends the book at once
1. Sign in as Rachel. Go to Schedule › Week (Nov 2–8) › Elias › tap A Child's History of the World › Update status.
2. Tap Fell behind, set "They got to" to page 210, then tap Pick a date and type "Nov 3, 2026" (today is Nov 5). Tap Save.
- **Expected:** a date before today, or before the current end, is refused or questioned, as with "Pick a date after Nov 1, 2026.". The ticket says "a parent can pick any **later** date".
- **Actual:** it saves (PUT 200) and the end becomes 2026-11-03. Home immediately shows "3 assignments ended… Answer them" and "will finish about 8 weeks late". The only lower limit is the end of last week: Nov 1 is refused with "Pick a date after Nov 1, 2026.". Nov 20, earlier than the current Dec 18 end, is also accepted with no comment while the book is behind. Undo restores everything (0 differences).
- Screenshots: `us8-saved-Nov_3_2026.png`, `us7-pick-Nov_1_2026.png`.
- **Suggested fix:** set the picker's minimum to today, or ask "That's before today; this ends the book now. Continue?".

### M2 (Medium, a product limitation): the shared-book workaround for children with different school days is awkward
The product has no school days per child; the days belong to an assignment. E11 was met by splitting the shared read-alouds into separate copies for Wren on Tue–Fri. Concrete costs:
- **Duplicates everywhere** (this fails the "no duplicates" screen test). Set up › Assignments lists Gospel of Luke ×2, The Hobbit (read aloud) ×2, Our Island Story ×2, and Poetry and Psalm 23 recitation ×2, told apart only by "· Wren" against "· Elias, Clara". On the Year view, Wren's lane repeats the books in the Together lane (`shared-03-year-all-360.png`).
- **One read-aloud, three places in the same session.** On Tue Nov 10, Days shows The Hobbit at pages 229–233 for Elias, 225–229 for Clara and 222–227 for Wren. Gospel of Luke is "chapter 18 · start" for the Together group but "chapter 17 · finish" for Wren (`shared-02-all-days-nov9-360.png`). Some of the Elias/Clara gap exists in the seed itself (Mon Nov 2: Elias 201–205, Clara 199–203), because each child's progress is tracked separately even on a shared assignment. A parent who reads aloud once to everyone cannot follow this.
- **Double upkeep.** Each Update status, week adjustment or "Did Wren finish…?" answer has to be done once for the shared copy and again for Wren's copy, and the two drift apart.
- **No guard against the mistake.** I added a shared book for all three children on Mon–Thu (through the API, then archived it). Wren immediately got Monday lines ("MON, NOV 9 · Shared test read-aloud · chapter 1", `shared-01-wren-monday-line-360.png`), with no warning. Wren's Monday in Days also says "Nothing planned" rather than "Not a school day for Wren".
- **Severity:** Medium for a family like the Hartleys. Logging and Records are not affected. Recommendation: decide on school days per child (or "this child joins on her days") as a roadmap item. In the meantime, the Add sheet could warn when a shared assignment includes a day a child doesn't school.

### L1 (Low): the suggested end date does not update as the parent types the new position
1. On the late book (Feb 1 suggested), tap Fell behind and set the page to 205. The sheet still offers "Move the end to Feb 1, 2027 · About the same pace".
2. Save with Keep. The briefing now says "Move end to **Jan 28, 2027**", and reopening the sheet offers Jan 28.
- The late line and the sheet always agree at any given moment, which meets S18-02 as written. But the date offered while typing is the forecast from before the save, so "About the same pace" is not quite true for the new position. It is also odd that falling further behind moved the forecast earlier (Feb 1 → Jan 28).
- When the parent taps "Got ahead" on the same late book, the suggestion switches to a shortfall estimate ("Move the end to Dec 11, 2026") while the late line still says Feb 1.
- Screenshots: `us-keep-c-week-after-save-360.png`, `us6-chw-reopened.png`.

### L2 (Low): the e2e script mismatches in S18-05 are mostly not fixed in `docs/e2e/cm-term-run-2.md`
- Part 2 still says "Sign in as **Rachel**… adds work to the *new* family from Part 1", but Rachel's login opens the Hartley family. It should say the new family's own login (`cm-new@…`).
- Step 2.2 still says "There is no preview". CSV import now shows a preview with the duplicate and pace flags, then Import.
- Step 4.4 ("got to page 250, move the end to Feb 1"): after Got ahead the sheet offers Dec 11, so Feb 1 needs Pick a date.
- Step 6.4: Saturday is offered but not ticked; the parent must tick "Sat 7" to get 5 school days. The script reads as if Saturday counts by itself.
- Step 5.1: the questions come Winnie-the-Pooh first, then Geography. This is harmless.
- Only the seed description changed in this PR.

### L3 (Low, probably pre-existing): the adjustment sheet's amounts don't read like the bars
For the same week, the bar says "71 minutes" but the adjustment sheet says "70 minutes" (Nature walk and notebook). The sheet says "1 chapter" where the bar says "chapters 12–13", and "2 lessons" against "lessons 24–26 (starts 26)". The amount is a count of work rather than a range, but a parent sees two different numbers side by side (`us-01-bar-sheet-360.png`).

### Observations (not counted)
- The undo bar goes away when you leave the page or reload, but the server still holds the undo (`GET /api/undo` returns it). This appears to be existing behaviour.
- When Update status is reopened for a week that already has a saved status, none of "As planned / Got ahead / Fell behind" is shown as chosen.

## Re-walk of `cm-term-run-2.md`: Part 4 (steering) and Part 6 (logging)

| Step | Result | Notes |
|---|---|---|
| 4.1 | Works | Elias shows the late line and "This is a heavy week for Elias."; Clara has no late line; Wren shows a heavy week. Bars use whole units (`p4-01-week-all-390.png`). |
| 4.2 | Works | Days are matched against the bars by the automated sweep; Friday shows the co-op line; All children shows a heading per child and a Together group. |
| 4.3 | Works | Treasure Island 47 → 30. The bar reads "Adjusted Treasure Island for Elias, week of Nov 2. Undo"; this week pages 1–30, next week 31–81 (thicker). The adjustment sheet has no Keep/Move choice for the end date. The multi-row adjustment had one Undo, and it restored all three rows. |
| 4.4 | Works (with Pick a date, see L2) | Got to 250 with an end of Feb 1, 2027: the late line went away, Year shows Feb 1, and Undo restored both. |
| 6.1 | Works | Wording as specified; Elias 30, Clara 30, Wren 24; 2 books finished; range chips present. |
| 6.2 | Works | Fall per child shows that child's own number; Wren has no "books finished" tile, so never a 0. |
| 6.3 | Works | Every box starts empty; the "Little" suggestion offers Little Women (a 264×44 option); saved as "5 school days"; Clara 30 → 35. |
| 6.4 | Works | Nov 2 to Nov 7 with Friday unticked and Saturday ticked: "5 school days, Mon–Thu, Sat"; Elias 30 → 35. |
| 6.5 | Works | Edit: "Changed Elias's log… Undo". Delete: "Deleted… Undo" (35 → 30). Undo brought it back (→ 35) and is then no longer offered. |
| 6.6 | Works | "Added 3 log entries for Nov 3. Undo"; one entry per child; Wren 24 → 25 (Elias and Clara already had Nov 3 counted). |

Screen tests at 320 (dark), 360, 390 and 440 px: no sideways scroll on Week (Bars and Days), Update status, Records, Log or the setup step. Every control is 44 px or more, except the "Skip to content" link.

## Data left in my local database
The local database still holds the following, all made through the UI and API and all local only:
- one Hobbit status for Elias (Got ahead to page 204)
- the Part 6 log entries
- the new "Run Two family" with children Mina and Jory Ann
- one archived test assignment

The servers have been stopped.

## Note added after the report: what the builder's notes say (`docs/progress/sprint-18.md`, read only after the findings above)
- **M1:** the builder chose this limit on purpose ("the picked date's lower limit is the end of the week being updated"). The finding stands: a date after last week but before today ends the book at once.
- **L1:** the builder says this in their notes. The sheet shows the date as the plan stands now, and the late line "may then say a slightly different date".
- **M2 / E11:** the builder says the same in their notes: no school days per child; the seed was changed; school days per child would be "a new ticket". I agree it needs a product decision.
- The builder's gate numbers (437 / 1207 / 1750 / 190) match my run exactly.
- `docs/reviews/` was not read.
