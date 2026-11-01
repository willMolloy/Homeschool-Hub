# Sprint 6 verification (steering: adjust a week, undo and reset, effort in time)

Tester verification of tickets S6-01 to S6-10 in `docs/tickets/sprint-6-steering/` at commit 675590c (HEAD 5d5b6a6 adds only docs), branch `claude/test-coverage-analysis-6dehbu`.
Date: 2026-10-31. No source or test files were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: PASS with one Medium and six Low findings. Every ticket meets its "Done when"

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled from the gate's log: **922 api** (65 files), **773 web** (63 files), **110 db** (17 files), **390 engine** (27 files), and 390 engine in each of the 7 `test:tz` zones.
- Setup: scratch database `hh_tester_dev` (demo seed; the family's login renamed to `tester@example.com` so it is not the demo, plus an empty `other@example.com` family for isolation). API on :3000, Vite on :5173, Chromium (Playwright) at 360 and 390 px. All servers are stopped and the database is dropped.
- Family "today" was Sat 2026-10-31, so the current week is Mon Oct 26 to Sun Nov 1 and is not yet finished. Nothing was mocked.
- Screenshots are in `docs/progress/screens/sprint-6/`. Full-page shots show the fixed tab bar mid-page; that is a capture artifact.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| M1 | Medium | S6-08/S6-10 | On a phone, Heavier, Lighter and Reset to original are 900 to 1,250 px off screen in a row with a hidden scrollbar |
| L1 | Low | S6-03 | A coming week's sheet labels each row "This week: N" |
| L2 | Low | S6-03 | The sheet's starting amounts are unrounded ("4.38 lessons", "88.89 minutes") and repeated twice per row |
| L3 | Low | S6-02/03 | An all-children adjustment plus a one-child adjustment in the same week shows a red engine message on This Week |
| L4 | Low | S6-09 | The effort question never says "a day" on its presets, and its hint shows an engine number ("default weight ... (15)") |
| L5 | Low | S6-06/08 | The undo bar after a week adjustment does not say which week or child ("Adjusted Math 5.") |
| L6 | Low | docs | `docs/progress/sprint-6.md` shows "(this commit)" for S6-10 |

### M1 (Medium): Heavier, Lighter and Reset are not findable on a phone

- **Reproduce:** 360 px, Timeline, select the Math 5 bar. Measured control positions (x, y, w x h): Move back a week 16,658; Start 417; End 610; End a week earlier 798; End a week later 985; Copy 1158; **Heavier 1245,658 98x45; Lighter 1350,658 92x45; Reset to original 1451,658 163x45**. The viewport is 360 wide. `scrollWidth` of the row is 1,597 against 328.
- **Expected:** the new steering controls reachable without hunting. The tickets say "on the edit bar" and "only what's essential; 360 px".
- **Actual:** the controls exist, are 44 px or more, and nothing overflows the page (`scrollWidth` 360 and 390). But they sit after Copy, about four screens to the right, so a parent will not see them. Keyboard focus does scroll the row to them.
- **Why Medium rather than Low:** these two controls are what C2 and C3 deliver, and nothing on the screen hints they exist.
- **Mitigation already planned:** the progress file says S6b-05 moves them behind "More". I agree that is the right fix; I record it so it is not forgotten.

### L1 (Low): "This week:" on a coming week

- **Reproduce:** This Week, tap `›` to Nov 2-8, "Make an adjustment" for Frank. The sheet's title is "Frank · Nov 2-8" but each row says "This week: 4.38 lessons". The current-week sheet is titled "Frank · This week · Oct 26 - Nov 1".
- **Expected:** "Planned: ..." or no repeat. **Actual:** wrong for any week but the current one (`adjust-sheet-changed-360.png`).

### L2 (Low): fractional starting amounts, shown twice

- **Reproduce:** current-week sheet for Frank shows "4.34 lessons", "88.89 minutes", "3.17 chapters", with "This week: 4.34 lessons" above the same figure in the same row. A first tap on minus rounds to a whole number (4.38 to 4, then 3, 2).
- **Expected:** a parent's amount ("about 4 lessons") and one copy. **Actual:** the plan's two-decimal value is the starting point. The progress file records this as a decision (rounded to 2 places), so this is polish (`adjust-sheet-360.png`).

### L3 (Low): "History: two overrides for the same week" in red on This Week

- **Reproduce (API only):** `PUT /api/week-overrides` with `childId: null` for a shared assignment and week, then the same with Frank's id. Open This Week for that week.
- **Expected:** the C1 rule (newest wins) settles it; no message, or a plain one. **Actual:** the plan resolves it (Frank 4, Margaret 2) but the engine warning prints as a red bullet under Frank's table (`this-week-null-and-child-override-warning-360.png`).
- **Why Low:** the sheet can only save a one-child adjustment, so only the API or a seeded row reaches it. S6-03's decision notes an every-child adjustment shows in the sheet but cannot be removed there.

### L4 (Low): the effort question's wording and hint

- **Reproduce:** Schedule, Assignments, Add assignment, Literature, Frank, 2026-11-02 to 2027-01-22, 300 lessons. The question "About how long will that take?" offers "15 minutes / 30 minutes / 45 minutes / 60 minutes / Custom". Only Custom's field says "Minutes a day". Untouched, the hint reads "Using the default weight for lessons (15). That's about 150 min a day."
- **Expected:** the ticket's own example is per day ("30 minutes" over 60 days gives weight 3), but a parent can read "30 minutes" as one lesson or the whole book. The design direction says weights never reach a parent screen. **Actual:** ambiguity on the presets and the word "weight (15)" in the hint. The saved list still shows "weight 12", "weight ~15 (default)" (S6-09 did not touch it) (`effort-question-360.png`, `effort-30-chosen-360.png`).
- The wording "About how long will that take?" is the ticket's.

### L5 (Low): the undo bar names the assignment but not the week

- "Adjusted Math 5." after saving Nov 2-8 (`undo-bar-after-adjust-360.png`). The ticket's format is "{label}. Undo", so this is as specified. It is a small gap for a parent who adjusted two weeks in a row.

### L6 (Low, docs)

- `docs/progress/sprint-6.md` shows "(this commit)" instead of `675590c` for S6-10.

## Observations (not defects)

- **O1, adjustment then check-in for the same week:** not testable live. The current week is not finished, and `GET /api/check-ins?weekStart=2026-10-26` answers 400 "you can only check in on a finished week". An adjustment on a finished week is refused (below), but I did not run the sequence end to end. The developer's API tests cover it (`check-ins-save.test.ts`).
- **O2, undo gives no confirmation:** after Undo the bar simply disappears and the page reloads.
- **O3, reset in the UI hides `kept`:** the API reports `kept: ["subject"]` or `["children"]` but the app does not show it (documented). A parent whose original subject was archived is not told it was kept.
- **O4, S6-09 removed the only way to clear an assignment's own weight back to the subject default from the form** (documented as "lost ability"). I would have kept a small "Use the subject's usual" choice; see Disagreements.
- **O5, the finished-week check:** the "This week" bar on a Saturday still offers to adjust Monday to Friday, which are over. Allowed by the ticket (the current week is "not before" now).

## Verified, per ticket

### S6-01: newest edit last. Meets "Done when"

| Case | Result |
|---|---|
| Science 5 for Frank: week Nov 16 pushEndDate saved first, then week Nov 9 keepEndDate (a different, earlier week edited later) | mode `keepEndDate`, end 2027-05-14 (unchanged) |
| Re-save Nov 16 as pushEndDate (now edited last) | mode `pushEndDate`, end 2027-05-20 |

### S6-02: endpoints. Meets "Done when"

| Case | Result |
|---|---|
| PUT current week (Oct 26), GET, DELETE | 200, listed, 204; then `[]` |
| PUT finished week (Oct 19) | 400 "a finished week is changed with its check-in, not an adjustment." |
| GET the same finished week | 200 `[]` (reading is allowed, documented) |
| Misaligned weekStart (Tue) on PUT and GET | 400 "must be the first day of a week (a Monday)." |
| plannedUnits 151 of 150; -1; 1.234; unknown mode; extra key; child not on assignment | each 400 with a specific message |
| Another family: GET (empty), PUT with foreign assignment (400 "no such assignment"), DELETE foreign id (404) | as expected, nothing leaks |
| Signed out | 401 |
| keepEndDate 1 for Math 5 week Nov 2 (was 4.38) | that week 1, next week 4.48, end stays 2027-05-21 |
| pushEndDate 1 on the same key | one row (replaced, same id), next week 4.38, end 2027-05-27 |
| Same key again with 3 | still one row, week = 3 (newest wins) |
| All-children (null) 2 plus Frank 4, same week, shared assignment | Frank 4, Margaret 2 (see L3) |

Units conserved: for all 34 plans (the seeded family plus the ones I created), `sum(days) + unplaced = total` to 1e-6, before and after every adjustment above, including plans with check-ins.

### S6-03: adjust a week on This Week. Meets "Done when"

- Current week and a coming week open the new sheet with starting amounts; a past week keeps the check-in sheet (not re-driven in the browser; the S6-03 web test covers it).
- Lowering Math 5 on Nov 2-8 shows "Keep the end date / Move the end date" only once an amount moved; a row with a saved adjustment shows "Back to plan". Save sent a PUT and the bar offered "Adjusted Math 5. Undo".
- Measured at 360 and 390: no control under 44 px (minus, plus, close 44x44, Back to plan 80x44, the two end-date buttons 165x44, Save 76x45); no horizontal overflow (`adjust-sheet-*-360.png`, `-390.png`).

### S6-04: no "Missed a day?". Meets "Done when"

- This Week at 360: Plan header, week switcher and one "Make an adjustment" per child; no "Missed a day?". The seed's blocked ranges (4, none of kind `missed`) still shape the plan. I did not create a `missed` day off to compare plans; the S6-04 web test covers the label under Days off.

### S6-05: original and last change. Meets "Done when"

- Migration 013 applied by `db:reset`; every seeded assignment had `original` (a SQL comparison of `original` against current values found no differences); assignments I created had it (reset restored them). `undo_entry` is one row per family (a second change replaced the first in every case below). The gate's db tests (110) pass.

### S6-06: record and undo. Meets "Done when"

Each case compared a full snapshot (assignments including archived, blocked ranges, week adjustments for 7 weeks, plan totals, ends and modes) before the change and after Undo.

| Change | Label | Undo restored exactly | Second undo |
|---|---|---|---|
| Drag (dates) | Moved Tester Book | yes | 404 |
| Edit (title and total) | Changed ... | yes | 404 |
| Weight nudge | Changed the weight of ... | yes | 404 |
| Weekdays change | Changed ... | yes | 404 |
| Archive | Archived ... | yes | 404 |
| Restore | Restored ... | yes (undo re-archives) | 404 |
| Day off create | Added a day off | yes | 404 |
| Day off edit | Changed a day off | yes | 404 |
| Day off delete | Removed a day off | yes | 404 |
| Bulk day offs (3) | Added 3 days off | yes (all three gone) | 404 |
| Week adjustment set | Adjusted ... | yes | 404 |
| Week adjustment replaced (same key) | Adjusted ... | yes (old amount and mode back) | 404 |
| Week adjustment removed | Removed an adjustment to ... | yes | 404 |
| Reset | Reset ... | yes | 404 |

- Unrelated writes (event create, family PATCH, child create, subject create) left the entry in place ("Changed Unrelated" still offered).
- Creating an assignment does not touch the entry (documented): after creating one, the earlier "Adjusted Science 5" was still offered.
- **Stale entries (409 `cannot_undo`, entry dropped):** the edited assignment deleted by SQL; a day off deleted by SQL; a move whose undo would put the start after a week that now has a check-in (start 11-02 moved to 10-12, check-in on week 10-19, undo refused). `GET /api/undo` is `null` afterwards each time.
- The undo is not itself undoable (no entry after it).

### S6-07: reset. Meets "Done when"

| Case | Result |
|---|---|
| Edited dates, weight 2 and title, plus an adjustment, plus a check-in on week Oct 19 (position 50) | 200; created dates and null weight back; the check-in is still listed, the plan still has done 50; the adjustment is gone; `kept: []` |
| Undo of that reset | edited values and the adjustment back |
| Original start 11-09, now 10-12 with a check-in on week 10-19 | 409 `check_in_outside` "The week of Oct 19 has a check-in, so the start can't move past it."; assignment and undo entry unchanged |
| Original subject archived since | 200, `kept: ["subject"]`, current subject kept, title restored |
| Original child archived since | 200, `kept: ["children"]`, current children kept |
| Another family's id; malformed id | 404 both |
| `original` set to NULL by SQL | 409 `no_original` |
| Untouched assignment | 200, no undo entry |

### S6-08: undo and reset in the app. Meets "Done when"

- Undo bar (360 px): "Adjusted Math 5." and a 69x44 Undo button in a pill at y 554-602, above the tab bar (top 708 incl. its row). Page shows no horizontal overflow. It is the 8th focusable in DOM order (after Skip to content, the five tabs and Sign out) and Enter on it undoes (the bar goes).
- With the edit bar open the undo pill's bottom is at 602 and the edit bar's top at 610: it does not cover it (`edit-bar-after-heavier-360.png`).
- Reset to original at 390: dialog "Put Math 5 back to how you created it?" with "Its dates, weight and days go back, and its week adjustments are removed. ..."; buttons 44 px or more; Reset sent one POST to `/api/assignments/:id/reset`; the bar showed "Reset Math 5. Undo"; Undo brought back weight 31.25 (`reset-confirm-390.png`, `after-reset-undo-bar-390.png`).
- See M1 for where the button sits.

### S6-09: effort in time. Meets "Done when"

- 300 lessons, 2026-11-02 to 2027-01-22 (60 weekdays), tap "30 minutes": the POST body carried `"weightPerUnit":3` (30 / 5 / 2). The line above reads "About 5 lessons a day".
- Untouched: Custom is preselected with "150" minutes (the built-in lesson weight 15, over 5 a day), and the POST would carry no explicit weight, as today.
- Presets 141x46 and the Custom field 205x45; no overflow at 360. Not clicked through for chapters or minutes in the browser; engine and web tests cover those.

### S6-10: Heavier and Lighter. Meets "Done when"

| Weight shown | Action | Request | Result |
|---|---|---|---|
| Math 5 (subject default 20) | Heavier, Heavier | `weightPerUnit` 25, then 31.25 | 1.5625 times, as ticketed; the list then showed "weight 31.25" |
| 100 (the limit) | - | none | Heavier disabled, a forced click sends nothing |
| 90 | Heavier | 100 | then Heavier disabled |
| 0.01 | - | none | Lighter disabled |
| 0.02 | Lighter | 0.01 | then Lighter disabled |

- Controls only show with a bar selected. Each is 98x45, 92x45 (see M1). Undo labelled "Changed the weight of Math 5." works (API checks above). "The next suggestion follows the nudge" is covered by the developer's API test; I did not repeat it.

## Tap-target script

`CHROME_PATH=/opt/pw-browsers/chromium TAP_EMAIL=tester@example.com TAP_PASSWORD=demo-password node flow.mjs tap-targets` (from `scripts/smoke`): every screen and panel "none", including "Timeline (bar selected)" (60 controls, with the new buttons) and "Assignments > Add assignment" (60 controls, with the effort presets); ends "No undersized controls on the listed screens." The script does not open the adjustment sheet, the undo bar or the reset dialog; I measured those by hand at 360 and 390 (all 44 px or more).

## Design-direction screen tests

Observations, not defects: the visual redesign is later.

| Screen | Five seconds | One job | No duplicates | Parent's words | Empty state | Phone first |
|---|---|---|---|---|---|---|
| Adjustment sheet | Pass: "Frank · This week", amounts with plus and minus | Pass | Fail: the amount appears twice per row; "Keep / Move the end date" is a second question for every change | Fail: "4.38 lessons", "88.89 minutes"; "overrides" text (L3) | Not shown: a child with no work has no row (a note "nothing planned" is on the card) | Pass: 44 px, no overflow, but a long list needs scrolling to Save |
| Undo bar | Pass: sentence and one button | Pass | Pass | Partly: names the assignment, not the week (L5) | n/a | Pass: reachable, clear of the tab bar and edit bar; it floats over table rows |
| Edit bar | Fail: a one-line row 1,600 px long; the title row says nothing about the hidden controls | Fail: move, dates, copy, weight, reset all in one bar | Fail: Move forward a week, Start/End and End a week later overlap in job; "Reset" beside the dates and "Reset to original" differ and can confuse | Fail: "Heavier/Lighter" is good; "Reset" versus "Reset to original" is not | Not shown (needs a selected bar) | Fail on discoverability (M1); 44 px and no page overflow pass |
| Effort question | Partly: "About how long will that take?" is clear, but not per day (L4) | Pass | Pass: raw weight field is gone | Fail: "weight (15)" in the hint | Pass: a new assignment shows no question until total, dates and days are set, then a short prompt | Pass: 2-up presets 46 px tall, no overflow |

Also noticed on This Week: the tables show effort numbers (77.1, 20.8 ...), which the redesign already plans to remove.

## Decisions I disagree with, or would change

- **S6-09 "lost ability":** removing the only form route back to "follow the subject default" for a weight. A one-line "Use the subject's usual" choice under Custom would keep it and costs little. Minor.
- **S6-10 placement:** acceptable as a stop-gap only because S6b-05 follows. If S6b-05 slips, M1 stands.
- **S6-03 "which sheet":** on the default view "Make an adjustment" no longer opens last week. The decision is documented and consistent with the ticket, but a parent who used it for last week now has to find the week switcher or the card. Not a defect; worth a line in user-facing help.
- I agree with: S6-06 recording day-off edits, S6-07 treating children all-or-nothing when an original child is archived, S6-02's 400-for-everything and 404-for-missing rule, and S6-06 not recording assignment creation.

## What I could not verify

- A check-in on the same week as an adjustment (the week is unfinished; O1).
- A `missed` day off changing the plan after S6-04 (only that the seed's four days off are holiday and vacation kinds and the label test exists).
- Chapters-based and minutes-based effort presets in the browser.
- That the next assignment's suggested weight follows a nudge (API test only).
- Screen-reader output of the undo bar (`role="status"`); I checked the role and the keyboard path only.
- A week-adjustment save from the sheet when the PUT fails (not forced).
