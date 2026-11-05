# Sprint 17 verification (backlog cleanup and end-to-end run prep)

This is the tester pass for Sprint 17, ticket S17-05. It covers S17-01 to S17-04 (commits 3fd8cb1..56e8458) on branch `claude/sprint-17-cleanup`, tested at the tip 56e8458. Date: 2026-11-05 (the machine's date, and the app's "today" for America/Chicago).

I changed no product code, test code or scripts. The only files I added are this report and eight screenshots in `docs/reviews/sprint-17/`; I also filled in the S17-04 hash (56e8458) in `docs/progress/sprint-17.md`.

> **Independence note:** I am a separate tester agent and did not write the Sprint 17 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: READY for Will's look after one small crash fix (1 High, 1 Medium, 2 Low findings, 4 notes)

Every S17-01 and S17-02 item works as written, in a real browser and by API. The seed builds the Hartley family in one command and every screen has real content. The gate is ALL GREEN, and a full smoke round (32 runs) passes.

The one High is not a Sprint 17 regression, but the new seed is what exposed it: on the Hartley family, **Schedule · Year · Spring crashes the whole page** ("Unexpected Application Error") because Clara has a stopped book that ended in the fall (N1). The same crash happens on the build from before Sprint 17. Step 3.2 of the new walk script goes straight into it. The Medium is that the first third of the walk script does not match the app in seven places (N2). Both are quick to fix.

## Numbers

- **Gate:** `scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate), run once, first, on a clean tree; log in the scratchpad `check.log`.

  | Package | Tests |
  |---|---|
  | engine | 437 (and 437 in each of the 7 `test:tz` zones) |
  | api | 1198 |
  | web | 1678 |
  | db | 190 |

  These match the developer's S17-04 counts exactly.
- **Tickets:** S17-01 pass (every item), S17-02 pass, S17-03 pass (with N1 found through it), S17-04 partly passes (first third dry-run: N2).
- **Smoke:** one full round, 32 runs (31 scenarios plus `tap-targets` again at 320 px with `TAP_WIDTH=320`), re-seeding before each except `kids-edit`. **32 exit 0.** `accounts`, `days`, `full-flow`, `new-family`, `records`, `view-only` say "PROBLEMS: none"; `sheets`, `completion`, `term-review` say "ok"; both `tap-targets` runs say "No undersized controls on the listed screens."
- **My own checks:**
  - 132 page states on the Hartley family (Rachel on 16 screens, Grandma Joan on 6, at 320, 360 and 1280 px in light and dark): no sideways scroll, no control under 44 px, axe clean, except the bare `/print/week` and `/print/day` addresses typed with no week (N4).
  - 24 print-sheet states with real weeks and days (all clean).
  - A live API walk of every `:id` route with another account's ids.
  - Scripted browser flows for each S17-01 item.
  - A dry run of Parts 1 to 3 of the walk script.
  - Findings: 1 High, 1 Medium, 2 Low (N3, N4), 4 notes (N5 to N8).

## Setup

- Postgres 16 (role hh/hh). Scratch databases `hh17_dev` (demo and second family, for the smoke round), `hh17b_dev` and `hh17c_dev` (the Hartley seed, with and without my edits) and `hh17_nodev` (for the refusal checks only). **All four were dropped at the end**; only `hh_dev` and `hh_test` remain.
- API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173 only (plus, briefly, a second Vite on 127.0.0.1:5174 serving the code from before Sprint 17 to check N1), all stopped afterwards. Nothing was exposed and nobody was contacted. Nothing installed.
- Browser: Playwright's Chromium (`/opt/pw-browsers/chromium-1243`) driven through the repo's own `puppeteer-core` and axe; `CHROME_PATH` pointed at it for the smoke scripts.
- Smoke screenshots went to the scratchpad (`SCREENS_DIR`), except `sheets`, which I ran with no `SCREENS_DIR` to test S17-01 item 8.
- To see the month-view line I added Mon/Wed and Tue/Thu books for Clara (and a short Mon/Wed book ending Nov 18) to my scratch copy of the Hartley family, plus label-less days off of each kind and a very slow 5-chapter book for Wren. The fresh, untouched seed was used for the N1 reproduction and the Spring check.

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S17-01 Low backlog cleanup | **Pass** | All nine items checked; details below |
| S17-02 Security tidy-ups | **Pass** | 14 of 14 `:id` routes 404 (parent) and 403 (viewer) with another account's real ids; totals, log list and pace 404 |
| S17-03 Charlotte Mason family | **Pass** (N1 found with it) | Builds in one command; refuses non-dev names and production; every screen has content for each login |
| S17-04 Run script | **Partly: needs fixes** (N2) | Parts 1 to 3 walked; seven steps do not match the app |

### S17-01, item by item

1. **Week filter. Pass.** On the Hartley family, Elias has the late book. Schedule · Week, this week and the coming week, at 360 px light and 1280 px dark: All children and Elias show "A Child's History of the World will finish about 6 weeks late..." with its Move end / Keep buttons; **Clara and Wren show neither**, and each child's own "This is a heavy week for Clara/Wren" line shows. Switching back to All children brings it back. Home's line is whole-family and still shows it. A viewer (Grandma Joan) sees no late card at all, as before. Screenshot `week-filter-clara-360-light.png`.
2. **Home checklist control. Pass.** A new family (made with the real `create-family-invite` command and the join page): Home shows "Getting started: Add your breaks"; tap Hide and it goes; Family settings then has a "Getting started" card with "Show the getting-started checklist again"; tap it, it says "The getting-started list will show on Home again."; Home shows the list again; the card is gone from Family settings. Axe clean and 44 px at 390 px. While the checklist is showing, the card is not offered.
3. **L5 Rose and Lilac. Pass.**
   - *Colours.* The Rose fill is now `#F9C0BE` (light) and `#613033` (dark). With my own CIEDE2000 calculation the distance from Lilac is 10.8 (light) and 10.0 (dark), and from every other fill at least 8.7 (the nearest is Coral). Ink on the Rose fill is 9.0:1 (light) and 8.95:1 (dark), so the "9:1" in the progress note is a hair high for dark; AA is not at risk (N8). The Rose "strong" colour on the page background is about 6.5:1 light and 8.5:1 dark.
   - *On screen.* In the real Add subject form at 320, 360 and 1280 px in both themes, the two chips are clearly different (light: dark crimson against a dusty mauve; dark: salmon against a lilac pink).
   - *The cue.* Focusing a swatch says it in words under the row: "Lilac is also used by Literature.", "Rose is also used by Recitation.", "Coral is also used by Picture study." Screenshot `swatches-rose-lilac-360-dark.png`.
4. **Day-off wording (Sprint 14 N6). Pass.** I made one label-less day off of each kind and some with labels. Days off list: "Sick day", "Day off", "Holiday", "Break", "Missed day" (title, then who); a labelled one keeps its label ("Dentist", "Flu at Grandma's"). The Kind list reads Break, Holiday, Sick day, Day off. The same words show on Days (week of Nov 9, per child: Wren "Sick day", Clara "Day off", every child "Holiday", Elias "Break"), on the weekly sheet ("Tue · Sick day", "Wed · Day off", "Fri · Break", "Thu · Dentist") and on the daily sheets ("Sick day", "Day off", "Holiday" once per child sheet, "Break", "Flu at Grandma's"). A "missed" day does not show in Days or on the sheets by design (it carries work forward; the code skips it). Screenshot `sheet-sick-day-wren-390.png`.
5. **Throttled invite (Sprint 14 N4). Pass.** I used up each limiter through the API, then used the real screen. Invite another parent, Create a sign-up link (view link), and the join page's Create my sign-in all show **"Too many tries. Please wait a minute and try again."** (a red box, not the generic save error). Screenshot `throttle-invite-390-light.png`. (The invite's other refusal, the open-invite cap, is a 409 and has its own words; I did not change that.)
6. **Term in review on short desktops. Pass.** At 1280 x 800 the card is 517 x 646 px (was 352 x 440 per the progress note), with the range, child and Print / Save buttons in a right-hand column; the whole page fits the window with no scrolling (document height 800). At 1280 x 720 it is 453 x 566; at 1440 x 900 597 x 746; at 1280 x 1000 it is single-column 512 x 640 (taller than 960 px stays as before); at 900 x 960 two columns, at 899 x 960 one. Phone widths are unchanged (360: 304 x 380; 320: 224 x 280; 390: 358 x 448). Axe clean and 44 px in all of them, light and dark. Screenshot `term-in-review-1280x800-light.png`.
7. **Sprint 15 Lows. Pass.**
   - **Sprint 15 N1** (viewer, bad JSON): live API, a viewer's POST with `{not json`, an empty body with a JSON type, and a PATCH with `{` all give **403**; the same from the parent gives 400; signed out gives 401.
   - **Sprint 15 N2** (name above a narrow row): in the Year view's This month, at 320, 360 and 1280 px in light and dark, names appear on a small muted line just above a row, left-aligned with its first block: "Our Island Story · C W", "Picture study: Winslow Homer · E C W", "Anne of Green Gables", "Pathway Readers", and, for the Mon/Wed book I added (Nov 2 to 18), "Mon Wed poetry reader" at 320 and 360 px (x = 45, the same as its first block). At 1280 px that same book's name sits to the right of its blocks (the existing rule) and rows wide enough keep the name inside. A Mon/Wed book that runs past Thanksgiving gets its name inside the wide post-break block, so no extra line; that is the developer's stated rule. Muted colour in both themes (light `rgb(110,101,90)`, dark `rgb(179,169,155)`). Screenshots `month-name-above-320-dark.png` and `month-name-above-360-light.png`.
   - **Sprint 15 N3**: a 5-chapter book over three weeks for Wren: "Chapter 5 · start" the day before and "Chapter 5 · finish" on its last day (in Days and on the daily sheet). The ticket's words were "Finish Chapter 8"; the developer kept the Sprint 16 words, which is fine.
   - **Sprint 15 N5**: join tokens of 20, 100, 150 and 1999 characters (page, and the API for 60 to 1999) give the plain "This link can't be used" message. At 2001 characters or more the framework still answers 414 and the page says "Something went wrong" (finding N3 below, Low).
   - **Sprint 15 N6**: every join page, including a bad link, sends `robots: noindex, nofollow` and no-referrer.
8. **Smoke `sheets` leaves no files. Pass.** I ran `node flow.mjs sheets` with no `SCREENS_DIR`: "sheets scenario: ok", screenshots in `/tmp/hh-smoke-screens`, and `git status` clean afterwards (again after the whole smoke round).
9. **ROADMAP. Pass.** "Open backlog (Low)" now says none are open, with the fixed items listed.

### S17-02 by API

Run against the live API on the seeded family with Rachel (a parent of the Hartley family), Grandma Joan (a viewer of it) and the co-op account as "the other account". I made real rows in the co-op for every kind of thing a route takes by id (assignment, days off, child, subject, event, log entry, calendar template, open invite, view link, week override and a viewer), so the ids are real, not made up.

- **All 14 `:id` routes:** as Rachel each is **404**, as Joan each is **403**: `PATCH/POST reset` assignments, `PATCH/DELETE` blocked-ranges, `DELETE` calendar-templates, `PATCH` children, `PATCH` events, `DELETE` family/invites, `PATCH/DELETE` log-entries, `PATCH` subjects, `DELETE` week-overrides, `DELETE` view-links, `DELETE` viewers. The co-op's rows were unchanged afterwards. My list of routes from the source matches the developer's walk (14).
- **Foreign ids on reads:** `GET /api/records/totals?childId=`, `GET /api/log-entries?childId=` and `POST /api/plan/pace` (foreign child, foreign subject, and one foreign child in a list of two) all give **404** for Rachel, and the same 404 for a made-up id. Joan gets the same 404 for totals and the log list, and 403 for pace (a POST, which a viewer can never make). Own ids still give 200 (including a null subject for pace), and totals with no child (all) still gives 200.
- **Writes with foreign ids in the body** keep their 400 as the developer said (covered in their tests; I did not duplicate it).

### S17-03 seed

- **Fresh `_dev` database:** `npm run e2e:seed` on an empty `hh17c_dev` migrates and builds the family (3 children, 11 subjects, 30 assignments for the Hartleys plus 5 for the co-op, 5 days off, 2 co-op events, 21 log entries, 2 parents, 1 viewer) and prints four logins. `-- --reset` also works and takes about a second and a half. Running it again on the same database leaves one of each (1 Hartley family, 4 accounts, 35 assignments, 21 entries, no sessions).
- **Refusals:** a database not ending `_dev` is refused before anything is touched (with and without `--reset`, via `--url` and via `DATABASE_URL`; also `...?app=_dev`, `hh17_dev_x` and `_dev/hh17_nodev`), and `NODE_ENV=production` is refused with its own message. The refused database stayed empty (0 tables).
- **Screens as each person.** Rachel and Tom: Home ("2 assignments ended", the late line, "Week 12 of 40"), Week (Bars and Days), Year (Fall, This month; Together lane with E C W initials, "Prima Latina · Stopped", "Burgess Bird Book ✓"), Records (Elias 30, Clara 30, Wren 24 school days; 189 h 20 m; 2 books finished; hours by subject; Books mentioned), Term in review (Elias · 2026-27 with real hours and books), Set up (children, subjects, assignments with "about N min a day", days off with the new words, events "Lighter by default (60%) · Skip: ..."), Family settings (both parents, Grandma Joan listed as a viewer). Tom's family menu says "Signed in as Tom Hartley" and "Switch to Hearth Co-op", and the switch works. Grandma Joan: opens on Schedule with "View only · Hartley family", Week, Days, Year, Records and Term in review; every `/setup/...` address redirects back to Schedule. The co-op (as its lead and as Tom): Friday classes only, "Week 9 of 15", Year with five classes, Records "set up your log" for the lead and "Nothing has been set up to track yet" for Tom (view only), a viewer's invalid-JSON write gets 403. All with no page errors, no sideways scroll, no control under 44 px, axe clean at 390 px.
- **Spot findings:** **N1 (High)**, the Spring zoom crash. Otherwise the numbers match what the walk script says.

### S17-04 dry run (Parts 1 to 3)

Walked Part 1 with a real family (link from `npm run create-family-invite -w @hh/api`, joined in a separate browser context), Part 2 on that family, and Part 3 on the Hartley family. Anything not listed below matched: 1.1 (44 px, the used/made-up link gives one plain message, noindex), the "Step N of 6" bar, Back from step 2, no Skip on children, Finish later from step 3, typed dates reading back written out, 1.2's "get back to you" on breaks, 2.1's "Added 3 assignments. Undo" and "about N min a day" in the list, 2.2's line-numbered message with nothing imported until fixed, 2.4's undo (only the last import went), 3.1's text, 3.3's names, 3.4's "About 0.4 chapters a day ... Usually about 8 min a day". Seven steps do not match (N2); one step crashes (N1).

## Findings

**N1 (High): Schedule · Year · Spring crashes the whole page on the Hartley family.** Steps: fresh seed (`npm run e2e:seed -- --reset`), sign in as `cm-rachel@example.com`, Schedule, Year, tap **Spring** (All children or Clara). Result: "Unexpected Application Error! Cannot read properties of undefined (reading '0')", a stack trace in `features/timeline/layout.ts`, and no way back except reloading (`n1-spring-zoom-crash-390.png`). Elias and Wren alone are fine; Clara and All children crash, at 390 and 1280 px. The cause looks like Clara's stopped book, **Prima Latina** (stopped, ended Oct 23): in Spring it has no blocks, and the stopped branch of the name placement reads `pieces[pieces.length - 1]![0]` on an empty list. It is **not a Sprint 17 regression**: I served the code from 3fd8cb1~1 on a second port against the same database and it crashes the same way (Fall, Year and This month are fine; month-by-month navigation to January and February is fine too). It is a real parent path (stop a book in the fall, open Spring in January), and walk step 3.2 ("Try Year, Fall, Spring and This month") hits it. Fix: skip an assignment with no pieces before the stopped test, and add a test with a stopped book that ended before the zoom range.

**N2 (Medium): the first third of `docs/e2e/cm-term-run-2.md` does not match the app in seven places.**
1. **1.1** says the join page "says it is for a new family". It says "Welcome. Make your sign-in, then we will set up your family together." (it says nothing about a new family).
2. **1.2** puts "Mon to Fri" in step 1 and gives the children ages ("Mina 9, Jory 6"). Step 1 is the family name and the week's first day; the children step (2) takes **names only, no age**; school days are step 3.
3. **1.3** says "Land on Home". After step 6 there is an extra "You're all set... Go to Home" page.
4. **1.4** says Year shows hints one at a time at that point. On a family with no assignments Year says "Nothing planned yet" and there is **no hint** (no `data-tip` appears after 8 seconds); the first hint ("Thicker bars mean more work each day") only shows once a book exists, so the step belongs after Part 2.
5. **2.1** says each row has its own unit and gives "Heidi, 300 pages" with "Little Britches, 24 chapters" in one go. **Add several has one Unit for all rows** (and children are not pre-ticked: "Pick at least one child"), so mixed pages and chapters need two passes.
6. **2.2** says "The preview lists every row". There is no preview: Import either adds the rows ("Imported 3 assignments. Undo") or lists the line-numbered errors. The template's columns are `subject,title,children,unit,total,start,end` (children before unit), worth writing in the step, since a row typed in the order the step lists them fails with four errors.
7. **2.4** "Undo the CSV import from the bar" comes after 2.3 (Year). I only checked the Undo through the API after a full reload (`POST /api/undo` removed the three rows, the earlier books stayed); I did not check whether the bar survives an in-app move from Set up to Schedule. If it does not, the step should be 2.3 before 2.2's bar is gone or just "Undo straight after the import".

**N3 (Low): a join token longer than 2000 characters still gives the framework's 414 and the page says "Something went wrong... Check your connection".** Steps: open `/join/` plus 2500 letters. The ticket's limit (over 100 characters) is met (up to 1999 gives the plain bad-link message), so this is only an absurd-length edge. Same for the API (`FST_ERR_MAX_PARAM_LENGTH` JSON).

**N4 (Low): `/print/week` and `/print/day` typed with no week or day show "That sheet needs a week..." with no heading, so axe reports `page-has-heading-one` (moderate).** Steps: sign in, open `/print/week`. With real parameters every sheet is axe clean (24 states). Only a hand-typed address reaches it.

**N5 (note): once N1 is fixed, walk step 3.2 should say what Spring shows for Prima Latina** (it ended in the fall, so it should simply be absent there); today the step only describes Fall.

**N6 (note): the progress note says Rose has 9:1 ink on its fill.** Measured 9.01:1 in light and 8.95:1 in dark. Still far above AA, so this is only a wording fix if anyone cares.

**N7 (note): a "missed" day has no word on Days or the sheets.** By design (it carries work forward and is not a break), so the day-off wording is only for the other four kinds. The Days off list does show "Missed day".

**N8 (note): the sign-in limiter bites quickly in scripted walks** (I got a 429 on sign-in after a burst of scripted sign-ins from one machine). Real parents will not hit it; anyone running the agent version of the walk should sign in once per person and keep the session, as I did.

## What Will should look at first

1. **N1.** A one-line guard fixes a white-screen crash that the Hartley family triggers in two taps; it is older than this sprint, but the end-to-end run walks into it at step 3.2.
2. **N2.** Seven small wording and order fixes in `docs/e2e/cm-term-run-2.md` so the run can be walked without stopping (the biggest are the Add several units, the missing CSV preview, and the missing hint on an empty Year).
3. The new things worth a look with your own eyes: the name above a thin row on This month at 320 px in dark (`month-name-above-320-dark.png`), Rose next to Lilac in the Add subject form (`swatches-rose-lilac-360-dark.png`), and Term in review at 1280 x 800 (`term-in-review-1280x800-light.png`).
