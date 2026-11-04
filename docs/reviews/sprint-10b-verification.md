# Sprint 10b verification (colours, navigation, the wide layout, S9b-07)

This is the tester pass for Sprint 10b, ticket S10-10b. It covers S10-09, S10-11 to S10-14, S10-16 to S10-19 and S9b-07. Each ticket was checked against its "Done when", against `docs/design/mockups/year-polish*.png` (the same files as `/workspace/hh-mockups`) and against DeeDee's decisions (a rail instead of a sidebar, 12 colours, one way to do each thing). It was run on branch `hh2/sprint-10b` at c7e06ef, on top of the 10a merge 6069278. The commits under test were:

- S10-11 e553209
- S10-12 3964add
- S10-13 dc2c891
- S10-09 4a86f38
- S10-14 3777402
- S10-16 ed32332
- S10-17 0c3a95e
- S10-18 1dff685
- S10-19 e398e03
- S9b-07 a4eec20
- docs c7e06ef

Date: 2026-11-04.

I changed no product code, test code or repo scripts. This report is the only file I added. As in 10a, the coordinator's brief said to commit only this file, so my scripts stay on the tester's machine in `/workspace/hh-s10b-test/pw/` and are not "kept beside the report" as the ticket's Tests line asks. They can be copied in later if Will wants them.

> **Independence note:** I am a separate tester agent. I did not write the Sprint 10b code, and I ran everything on my own stack. However, the same coordinating agent wrote the tickets, directed the coding agent and briefed me. So this is not an independent review by a different person or team.

## Verdict: NOT READY for a PR to main (two Mediums, both small)

Every ticket's own Done when passes, the gate is ALL GREEN, and the browser sweep (144 page × width × theme runs) is axe-clean with no sideways scroll. Navigation, colours, the Set up back links, the one-row Week header, the column caps, Home's two panes and the side panel all work as described.

Two Medium findings hold it back. Both are in S9b-07's new day chips and both are small:

- **M1 (accessibility):** axe reports `label-content-name-mismatch` (serious, WCAG 2.5.3, Level A) on the run's date chips. A chip shows "Mon 2" but its accessible name is "Monday, Nov 2", so a voice-control user saying "click Mon 2" misses it. The sweep never opened the Log form with a run, which is why it was clean there. The repo's smoke axe uses the same axe-core 4.14.0, so the project's own axe would flag it too once a scenario opens a run.
- **M2 (data):** in the edit form, changing a run's dates throws away the days the parent ticked by hand and re-preselects from the calendar. A ticked day off (Frank's dentist day, which the parent said counts) silently drops out. The coder's note says a parent never loses ticks silently, and this contradicts it.

Following the 10a convention (one Medium meant NOT READY), I mark this NOT READY. After M1 and M2 are fixed, re-check S9b-07 only. Everything else can go to main as is. The answers to DeeDee's two layout questions, (a) and (b), are Low and need not block.

Numbers:
- **Gate:** `bash scripts/check.sh` came back **ALL GREEN** ("ALL CHECKS PASSED"): lint, typecheck, build, db:reset, test, test:tz and db:validate.

  | Package | Tests | Change since 10a |
  |---|---|---|
  | engine | 420 (and 420 in each of the 7 `test:tz` zones) | 0 |
  | api | 1056 | +8 |
  | web | 1273 | +70 |
  | db | 144 | +3 |

- **10b tickets:** 10 of 10 pass their Done when. S9b-07 passes with M1 and M2 found beside it.
- **Carry-overs:** R1, R2, R3, R4, R5, R7, L5, L6, L7 and L10 are **closed**. Details below.
- **Smoke:** 3 full rounds, reseeded before each, with no pause between scenarios: **68 of 69 scenario runs pass; the one failure is `edge` in round 2** (a 30 s navigation timeout during a box-wide slowdown; it passed in rounds 1 and 3 and on a re-run). The 24 `tap-targets` width runs all pass.
- **Findings:** 0 High, 2 Medium (M1, M2), 6 Low (L1 to L6).

## Setup

- **Database and servers:**
  - My own embedded Postgres 16 on 127.0.0.1:5472 (databases `hh10a_test` for the gate and `hh10a_dev` for the browser), with migration 018 applied.
  - The API ran on 127.0.0.1:3919 and Vite on 127.0.0.1:5919, from an untracked local Vite config that I deleted before committing.
  - I did not touch the coder's Postgres (5462), API (3210) or Vite. There were no tunnels, nothing was exposed and nobody was contacted.
- **Browsers:** Chromium through Playwright with axe-core 4.14.0 injected, plus the repo's Puppeteer smoke scripts with `SCREENS_DIR` outside the repo.
- **Families:**
  - the demo family (`demo@example.com`: Frank and Margaret);
  - the second family (`smoke@example.com`), used for everything that writes, given a third child (Josephine) for the 3-child checks;
  - the empty family (`empty@example.com`).
  - I reseeded before each smoke round.
- **Files (not committed):**
  - Screenshots: `/workspace/hh-s10b-test/*.png`.
  - Logs: `check.out` / `check.log` (gate), `pw/sweep.log`, `rounds.log` and `smoke-r1/`, `smoke-r2/`, `smoke-r3/` (smoke), `export-*.csv`.
  - Scripts: `/workspace/hh-s10b-test/pw/` (`sweep`, `home`, `panel`, `tz4`, `three`, `log2`, `edit`, `apis`, `tot`, `fam`, `rd`, `exp2`, `r34`, `r4`).

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S10-09 Bar under 600, rail from 600 | **Pass** | Sweep at 320, 360, 390, 599, 600, 800, 840, 1024 and 1280, light and dark, on 8 pages: the bottom bar (4 items, 50 px tall) under 600, the 80 px rail at 600 and up, **never both**. Set up is in both, and exactly one item is current (Set up on Set up, Subjects, Children and Settings). Home has no Set up row. Rail labels sit behind the flag (`rail-labels-on-1280.png`, `rail-labels-off-1280.png`, `rail-labels-off-prodbuild-1280.png`). |
| S10-11 Twelve soft colours | **Pass** | Every demo subject has its own colour, with Art coral (`year-360-art-rose.png`, `subject-edit-art-360.png`). The 12 slots pass AA in both themes (axe clean, plus the unit test). Changing a subject's colour shows on the Year view. Rose and Lilac read close at a glance (L5). |
| S10-12 Subjects screen | **Pass** | Twelve 44 px swatches with a tick on the chosen one, used-by names, no colour dot, and a Show archived switch (`swatches-360-light.png`, `swatches-360-dark.png`, `subjects-13-360.png`). The "used" cue is subtle (L5). |
| S10-13 Week header in one row | **Pass** | The Week / Year switch, the arrows and "Nov 2 – Nov 8" share one row at 320, 360 and 1280. The arrows are 44 × 44. The old "This week" row and dates line are gone (`weekhdr-320.png`, `weekhdr-360.png`, `weekhdr-1280.png`). |
| S10-14 Set up back links | **Pass** | "‹ Home" on Set up and "‹ Set up" on its sub-screens are at least 44 × 44 at 320, 360 and 1280 (`back-_setup-*.png`, `back-_setup_subjects-*.png`). The "‹" glyph is part of the accessible name (L6). |
| S10-16 Column caps, one-column forms, L5, R3 | **Pass** | The content column is capped at 640 and forms at 480 (sweep: `maxW=640 forms=480` at 1024 and 1280). The Year view is uncapped. Forms are one column. The Add sheet's unit is chips, not a `<select>` (`add-sheet-320/390/479/480/1280.png`). Child switches fall back to an "All children ▾" pill (132 × 44) instead of wrapping (R3). |
| S10-17 Home in two panes from 840 | **Pass (functional), see (a)** | Under 840 Home is one column. From 840 the briefing and Schedule are in the wide pane and Records then Getting started in the narrow one (`home-*.png`, `home-empty-*.png`, `home-smoke-*.png`). The ticket's own "wide pane at least 480 px" is not met from 840 to 951 (answer (a), L1). |
| S10-18 Year edit as a 360 px side panel from 840 | **Pass (functional), see (b)** | At 1280: opening moves focus to the panel's heading; another bar swaps the content in the same panel; Esc, × (44 × 44, "Close") and a click on empty timeline each close it, with focus back on the timeline; Tab from the heading goes to Close; the panel is not modal. Under 840 the bottom sheet is used. axe is clean with the panel open (1280 light and dark, 840 dark, 390 light and dark). `panel-*.png`. At 840 the timeline beside it is 352 px (answer (b), L2). |
| S10-19 Carry-overs | **Pass** | See the carry-overs table. |
| S9b-07 A run shows which days count | **Pass (Done when), with M1 and M2** | See "S9b-07" below. |

### Tap targets

No control under 44 px in the sweep apart from inputs inside a larger label (the Show archived switch input is 44 × 26 inside a 167 × 44 label; the Settings and log-setup radios are 20 × 20 inside their option labels). The ones the ticket names:

- week arrows 44 × 44;
- both Set up back links at least 44 × 44;
- swatches 44 px;
- rail items 79 × 56, bar items 74–92 × 50;
- the S9b-07 day chips 44 tall, 50–74 wide (weekday chips 44 × 44).

### Badge vs bar tap zones (Year, demo family, Literature · Frank)

At 390 the badge is 44 × 44. Taps 22 and 40 px into it select the badge and show the "Literature" pop; taps at +44, +46 and +50 open the bar's sheet (Aesop's Fables). At 1280 everything up to +43 selects the badge and +46 onward opens the panel. The badge's hit shape is round, so its very corners fall through to the timeline background, not to a bar. `tz-badge-390.png`, `tz-badge-1280.png`, `tz-bar-edge-390.png`, `tz-bar-edge-1280.png`, `tz-bar-click-390.png`. **Pass.**

### 3-child family at 390

With Josephine given "Math 1", the child switch does not wrap at 320, 360 or 390 on Year, Week or Records. It falls back to the "All children ▾" pill (132 × 44). At 600 Week shows 4 chips in one row. `three-_schedule_view_year-*.png`, `three-_schedule_view_week-*.png`, `three-_records-*.png`, `r3-records-3kids-320/360/390.png`. **Pass.**

### Mockup side by side

Compared with `year-polish-desktop-1280.png` and `year-polish-phone-*.png`:
- **Matches:** colours and soft bars, the Together and per-child groups, badges, the axis with the Today pill, the break wash, the edit content (title, child and subject line, Start / End tiles, pace line, Copy and More), and the phone sheets.
- **Differences by decision:** the 80 px icon rail replaces the mockup's labelled sidebar, and the 12-colour palette replaces the mockup's.
- **Other differences (observations, not findings):**
  - At 1280 the mockup puts Week | Year, the zoom chips and the child switch on one row. The build stacks them on three rows (`year-1280-light.png`), which costs about 90 px of height before the timeline starts.
  - The mockup's panel is a rounded card inside the content area, under the title row. The build's is a full-height panel on the right edge (`panel-1280.png`).
  - The mockup's panel has a footer ("School days Mon–Fri", "Unit pages"). The build's does not.

## S9b-07: a run of days shows which days count

**Done when, part 1 (Mon–Fri family, Mon–Sun with Saturday ticked = 6 days): Pass.** Smoke family, Frank, Nov 2–8, at 390: Mon–Fri are preselected. Ticking Sat 7 gives "Counts Mon–Sat, 6 days." The saved entry reads "6 school days, Mon–Sat · Math 1 h". The API stores days Nov 2–7 and the totals count 6. `s9b07-monsun-390.png`, `s9b07-monsun-ticked-390.png`, `s9b07-monsun-saved-390.png`

**Done when, part 2 (Tue–Sat family preselects Tue–Sat): Pass.** With the family's school days set to Tue–Sat, a Nov 2–8 run preselects Tue–Sat ("Counts Tue–Sat, 5 days."). `s9b07-tuesat-390.png`

**Records totals and the CSV follow the ticks: Pass.**
- Frank, Nov 2–22: 14 school days. Nov 7–8: 1 (the ticked Saturday). Minutes are prorated by day.
- Custom range Nov 4–10 (clips both entries): totals 5 school days. The Each entry CSV gives 4 for the Nov 2–8 entry (Wed–Sat inside the range) and 1 for the Nov 9–15 entry (Tue 10). The Totals CSV gives 5. `export-Each-entry.csv`, `export-Totals.csv`

**API checks:**
- A single-day run, a day outside the dates, or no day ticked → 400 `invalid_days`.
- No day ticked with "counts as a school day" off → 201 with no days.
- Duplicate days are de-duplicated.
- A bad date → 400.
- Two children each store the same days.
- A PATCH of notes keeps the days. A PATCH that moves the end date without days resets to the calendar.
- Undo restores the dates and the days.

**Chips:** 44 px tall, two rows at 390, no overflow. A run over 14 days shows 7 weekday chips (M T W T F S S, 44 × 44) instead of dates; at 320 they wrap to 2 rows. Nov 2–29 for the Tue–Sat family reads "Counts Tue–Sat, 16 days. Days off are left out." (Thanksgiving week left out, correct). `s9b07-long-320.png`, `s9b07-all-320.png`, `log-form-390.png`

### Sanity check of the coder's choices

| Choice | Opinion |
|---|---|
| **Store the exact ticked dates** | **Agree.** It is the only way the count survives a later change to the family's school days or days off, and it keeps the CSV, the totals and the summary in step. The stored days survived edits, undo and multi-child saves. The one gap is in the edit form: M2. |
| **A ticked day off counts** | **Agree.** The parent is the authority on what happened. The form makes it explicit: days off start unticked with "Days off start unticked.", and ticking one counts it (Frank's dentist day, Nov 11: 5 days stored, `s9b07-frankoff-*.png`). |
| **Multi-child preselect uses "a school day for any child"** | **Agree, with a hint (L3).** It is the right default for a shared entry, since one child's day off shouldn't untick the day for everyone. But with All children ticked over Frank's dentist day, Wed 11 is preselected with no sign that it is Frank's day off, so it silently counts for Frank as well. A one-line hint ("Wed 11 is Frank's day off") would cover it. `s9b07-multi-390.png` |
| **Runs over 14 days can't tick a single day off** | **Agree.** Weekday chips keep a long run readable on a phone. Days off are still left out automatically, and the sentence says so. A parent who needs one exception can split the run. Fine for a homeschool log. |
| **The wording "6 school days, Mon–Sat"** | **Agree for a whole entry; it misleads on a clipped one (L4).** In a custom range that cuts an entry, the row reads "1 school day, Tue–Sat" (Nov 9–15 entry, Nov 10 in range). The count is the clipped count but the day names are the whole entry's. The "part of an entry from Nov 9 to Nov 15" line above it helps, but the pair still reads oddly. Suggest naming only the days in range ("1 school day, Tue") or dropping the names on clipped rows. |

## Carry-overs

| # | Status | Evidence |
|---|---|---|
| R1 Each entry CSV note | **Closed** | Line 2 of the Each entry CSV: "School days are per entry; a day in two entries is in both rows. For the real count, use the Totals export." Not on the Totals CSV. `export-Each-entry.csv` |
| R2 Clipped row | **Closed** | A "Part of" column after Last day reads "an entry from Nov 2 to Nov 8" and "an entry from Nov 9 to Nov 15" for the two clipped rows. Records shows the same line. `export-Each-entry.csv`, `export-390.png` |
| R3 "All children" on one line at 320 | **Closed** | Records and Schedule at 320, 360 and 390, 2 and 3 children: no wrap. 3 children fall back to the 132 × 44 pill. `r3-records-3kids-*.png`, `three-*.png` |
| R4 Zoom row cue at 320 | **Closed** | 30-character Fall name ("Autumn term at the lake cabin!"): the chip is capped at 120 px ("Autumn ter…"), Spring peeks out, and a caret sits before the pencil, at 320 and 360. `r4-30char-320.png`, `r4-30char-360.png`. At 840 with the side panel open, "This month" is clipped behind the caret (see (b)). |
| R5 Lowercase mid-sentence | **Closed** | "Your log tracks core and non-core hours." and "Your log tracks total hours and school days." on Records. |
| R7 `s2a-13-settings` 3 runs in a row | **Closed** | Passed in all 3 rounds, with no sleep between scenarios. In round 1 the login hit the 429 limit once and the new wait-and-retry handled it ("sign-in rate-limited (429), waiting 10 s (attempt 1)"). |
| L5 (10a) unit `<select>` in the Add sheet | **Closed** | Unit chips. `add-sheet-*.png` |
| L6 (10a) tap-targets and tile inputs | **Closed** | The repo's `tap-targets` passes at 320, 360, 390 and 1280 for both families, in every round. |
| L7 (10a) axe-2a mid-fade contrast | **Closed** | `axe-2a` clean in all 3 rounds. |
| L10 (10a) dates clipped at 360–479 | **Closed** | Start and end pairs stack under 480. `l10-assign-*.png`, `l10-daysoff-*.png` |

## New findings

| # | Severity | Area | Finding |
|---|---|---|---|
| M1 | **Medium** | S9b-07 day chips, accessibility | **axe `label-content-name-mismatch` (serious, WCAG 2.5.3 Label in Name, Level A), 7 nodes.** Records › Log, First day Nov 2, Last day Nov 8, at 390: each of the 7 date chips shows "Mon 2" but its `aria-label` is "Monday, Nov 2", so the visible text is not in the name. Voice-control users who say what they see miss the chip. **Fix:** start the name with the visible text ("Mon 2, Monday, November 2") or drop the `aria-label` and add the month as visually hidden text. The weekday chips of a long run ("M" → "Mondays") are not flagged (axe clean on Nov 2–29). Add the Log form with a run to the smoke `axe-2a` scenario so this stays caught. |
| M2 | **Medium** | S9b-07 edit form | **Changing a run's dates drops hand-ticked days without telling the parent.** Steps: smoke family, add a Frank-only day off on Nov 11. Log Frank, Nov 9–15, tick Wed 11, save (5 days stored: Nov 10–14). Edit it and change Last day to Nov 17: the chips re-preselect from the calendar, Wed 11 is unticked ("Counts Tue, Thu–Sat, 5 days"), and saving would drop the day the parent said counted. The same happens to a ticked Mon 2 after the family's days change. **Expected:** keep every ticked day still inside the new range and preselect only the newly added days. `s9b07-edit-390.png`, `s9b07-edit2-390.png` |
| L1 | Low | Home two panes (S10-17) | From 840 to 951 the wide pane is 368–479 px, under the ticket's "at least 480 px". At 840 the briefing and the Schedule subtitle wrap, and the card drops from 688 px wide (839) to 368 (840). See (a). |
| L2 | Low | Side panel (S10-18) | At 840 the timeline beside the panel is 352 px (plot 316), narrower than on a 390 phone (382 / 346), and the zoom chips clip "This month" behind the caret. See (b). |
| L3 | Low | S9b-07, multi-child | With All children, one child's day off is preselected (school day for the other child) with no hint, so it counts for that child too. Suggest a hint naming whose day off it is. `s9b07-multi-390.png` |
| L4 | Low | Records wording | A clipped entry reads "1 school day, Tue–Sat": the count is clipped but the day names are the whole entry's. `export-390.png` |
| L5 | Low | Colours (S10-11, S10-12) | Rose and Lilac read close at a glance, and the swatch "used" cue is subtle. Neither fails AA. `swatches-360-*.png` |
| L6 | Low | Small items | The "‹" glyph is part of the back links' accessible names. When another bar is picked while the panel is open, focus stays on the timeline rather than moving to the new heading (reasonable, but screen readers get no announcement). A full-page screenshot at 1280 can latch the child switch into the pill (an artefact of the page growing during capture; it doesn't happen in the viewport). |

No High findings. Pre-existing and not 10b: the family-wide "will finish late" card shows for Margaret's book under the Frank filter on Week (`r4-30char-320.png` before switching to Year).

## Answers to DeeDee's questions

### (a) Home's two panes are narrow from 840 until about 952

**Yes, they are, and I'd start the two panes at 960.** Measured (main width, then wide / narrow pane):

| Width | Layout |
|---|---|
| 800, 839 | one column, 688 wide |
| 840 | 760: **368** / 320 |
| 880 | 408 / 320 |
| 900 | 428 / 320 |
| 952 | 480 / 320 |
| 960 | 480 / 328 |
| 1024 | 512 / 360 |
| 1280 | 656 / 360 |

At 840 the briefing wraps to two lines and the Schedule card's subtitle wraps, and the main card gets narrower by almost half going from 839 to 840 (`home-839-light.png` vs `home-840-light.png`). From 952 (`home-952-light.png`) the wide pane meets the ticket's own 480 minimum; at 960 (`home-960-light.png`) both panes look comfortable. Moving the breakpoint to 960 (or 952) leaves 840–959 as the one 688 px column, which reads better than two cramped panes.

### (b) At 840 the timeline beside the 360 px panel is only 352 px. Should the breakpoint move to about 960?

**Yes, move it to about 960.** Timeline width with the panel open (whole timeline / plot area):

| Width | Timeline | Plot |
|---|---|---|
| 840 | **352** | **316** |
| 900 | 412 | 376 |
| 960 | 472 | 436 |
| 1024 | 536 | 500 |
| 1280 | 792 | 752 |

At 840 the timeline is narrower than on a 390 phone (382 / 346). Bar names truncate ("Robinson…", "The Wi…", "The Secre…") and "This month" is clipped behind the zoom caret (`panel-840.png`, `panel-840-dark.png`, vs `panel-960.png` and `panel-1280.png`). Under 840 the bottom sheet already works well (`panel-800.png`, `panel-839.png`). Ideally Home's two panes and the side panel share one "expanded" breakpoint at 960 so the app changes layout once. If 840 must stay, an alternative is to overlay the panel at 840–959 instead of pushing the timeline.

## Sprint 9, 9b and 10a regressions: none found

The Year view (badges, labels, the wash, bar heights) looks as in 10a at every sweep width. The `records` and `full-flow` smoke scenarios report "PROBLEMS: none" in every round. No ISO dates showed on the screens swept.

## Smoke scenarios

`scripts/smoke/flow.mjs <scenario>` against 127.0.0.1:5919, `SMOKE_EMAIL=smoke@example.com` for the writing scenarios, reseeded before each round, **with no sleep between scenarios** (the 10a run slept 8 s) to exercise R7's login-limit handling.

| Round | 23 scenarios | `tap-targets` at 320, 360, 390, 1280 × 2 families | Notes |
|---|---|---|---|
| 1 | 23 / 23 | 8 / 8 | `s2a-13-settings` hit the 429 once, waited 10 s, passed |
| 2 | 22 / 23 | 8 / 8 | `edge` timed out (30 s `networkidle0`) on `/?week=garbage&asOf=2026-13-40`. In the same minute `engine-version` took 208 s instead of 3 s, so the box was stalled. Re-run alone: pass. 429 handled (6 s). |
| 3 | 23 / 23 | 8 / 8 | 429 handled (11 s). One `tap-targets` run took 425 s, again a box slowdown, but passed. |

`full-flow` and `records` reported "PROBLEMS: none" in every round. I count the round 2 `edge` failure as environmental, not a product or script fault, but note it in case it recurs.

## Browser sweep

- **Widths and themes:** 320, 360, 390, 599, 600, 800, 840, 1024 and 1280, light and dark, on Home, Week, Year, Records, Set up, Subjects, Children and Settings: 144 runs.
- **Results:** no sideways scroll on any; **axe found 0 violations**; nav as described under S10-09; content caps 640 / forms 480 at 1024 and 1280.
- **Plus:** Home at 880, 900, 952 and 960; the panel at 800, 839, 840, 900, 960, 1024 and 1280; axe with the panel open, as listed.
- The Log form with a run was checked separately (M1).

## What Will should look at first

1. **Records › Log, Frank, Nov 9–15, tick a day off, save, then edit and move the last day** (`s9b07-edit-390.png`): M2, the ticks go.
2. **The day chips' names** (M1): a one-line change in `RunDayChips.tsx`.
3. **`panel-840.png` next to `panel-960.png`**, and **`home-840-light.png` next to `home-960-light.png`**: DeeDee's questions (a) and (b). I'd move both to 960.
4. **`s9b07-multi-390.png`**: whether a shared entry should say whose day off it is (L3).
