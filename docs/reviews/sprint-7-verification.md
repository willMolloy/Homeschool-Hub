# Sprint 7 verification (setup and polish)

Tester verification of S7-01 to S7-08, S7-10 to S7-12 and S7-15 to S7-21 in `docs/tickets/sprint-7-setup-polish/` at commit 1232702, branch `claude/test-coverage-analysis-6dehbu`. S7-09 is not needed (S6b-05 removed the scrolling edit bar). S7-13's report is reviewed below. S7-14 is this pass.
Date: 2026-10-31. No source or test files were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: PASS with seven Low findings and no High or Medium. Every ticket meets its "Done when"

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled from the gate's log: **953 api** (66 files), **896 web** (71 files), **120 db** (18 files), **391 engine** (27 files), and 391 engine in each of the 7 `test:tz` zones.
- Setup: scratch database `hh_tester_dev` (demo seed, login renamed `tester@example.com`) and three non-demo families made by SQL plus `set-family-login`: `t2@example.com` (children Ana, Ben, Cara; 62 assignments for Ana from 2027-08-16, three of them around the 2028 leap day, one shared with Ben; Cara empty), `t3@example.com` (one child, one subject, one assignment Nov 2 to Dec 18, used for the empty-calendar, new-subject, template and tap-target runs). API :3000, Vite :5173 in dev, Chromium via Playwright at 320, 360, 390 and 1280 px (Chromium only; touch driven by CDP events). All servers are stopped and the database is dropped.
- Family "today" was Sat 2026-10-31. Nothing was mocked except one deliberate failed request (below).
- Screenshots: `docs/progress/screens/sprint-7/`, prefixed `t-`. Full-page shots of long lists are not useful at that height; the viewport shots are.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| F1 | Low | S7-05 | The Fall / Spring / This month switches in the Zoom views sheet are 29 px high labels (20 px boxes) inside a 44 px row |
| F2 | Low | S7-04, S7-05 | The two tickets disagree on row order, and the build follows S7-04: hiding Fall and Spring and adding three terms gives "Year, This month, Term 1, Term 2, Term 3", not S7-05's "Year, Term 1-3, This month" |
| F3 | Low | S7-04 | A custom view that lies outside the plan's dates is selectable and draws the whole grid, looking exactly like Year, with nothing saying so |
| F4 | Low | S7-17 | A minutes-based subject reads "Light 0.5 min a minute", "Normal 1 min a minute", "About 1 min a minute" |
| F5 | Low | S7-12 | The tap-target script never opens the new Copy to a new year, Copy to another child or Zoom views panels, so "No undersized controls" says nothing about them |
| F6 | Low (observation) | S7-17 | The assignment form's effort question still offers "15 / 30 / 45 / 60 min a day" while its hint speaks in "min a lesson" |
| F7 | Low (observation) | S6b-09, pre-existing | A month with no work (This month on a new family, today Oct 31, first assignment Nov 2) draws only "Oct" and the Today line, with no words |

### F1 (Low): zoom switches are small tap targets
- **Reproduce:** 320 or 360 px, Timeline, tap Edit. Measure the three `role="switch"` inputs: each is 20 x 20 px, and its label is 53, 76 and 111 px wide by 29 px high. The list row around it is 44 px high.
- **Expected:** "44 px" (S7-05 Done-when). **Actual:** the row is 44 px but only the label and box take the tap, so the target is 29 px high. The script's rule (a checkbox is measured as its label) would flag them. The switches also look like plain browser checkboxes (`t-zoom-sheet-1280.png`), not the soft look in DESIGN_DIRECTION.
- Why Low: the whole text is tappable and rows are well spaced.

### F2 (Low): row order, a ticket conflict
- **Reproduce:** Edit, switch Fall and Spring off, Add Term 1, Term 2, Term 3, Save. The row reads Year, This month, Term 1, Term 2, Term 3 (`t-zoom-edit-3terms-360.png`). Moving Term 3 up reordered only the terms.
- **Expected:** S7-05 says "Year, Term 1-3, This month"; S7-04 says built-ins first (its example, "Year, Spring, This month, Term 1"). The build follows S7-04 and recorded the conflict. Not a defect; a decision for Will. Parents cannot move This month after their own terms.

### F3 (Low): a view with no overlap looks like Year
- **Reproduce:** Add "Far future" 2035-01-05 to 2035-03-01 and Save; tap it. It is shown as selected and the whole grid is drawn (`t-zoom-outside-grid-360.png`). The rule is documented ("No overlap shows the whole grid, as Fall and Spring do"), and the API accepts the view.
- **Expected:** at least a hint; nothing says "no work in these dates". Low because a view in dates a family has no plan for is rare.

### F4 (Low): "a minute"
- **Reproduce:** Subjects, edit Music, open Usual effort, choose "Minutes": chips "Light · 0.5 min a minute", "Heavy · 1.5 min a minute"; caption "About 1 min a minute. The bar shows 30 minutes a day." (`t-subject-minutes-unit-360.png`). Progress notes record it as honest but odd. A parent would read it as nonsense.

### F5 (Low): tap-target script coverage
- `TAP_WIDTH=320` and `360` both pass ("No undersized controls on the listed screens."), but the list has no Copy to a new year, Copy to another child, Edit zoom views or New subject entries. My own measurement at 320 and 360 px found only F1 (the switches). Controls in both Copy panels are all 44 px or more, none past the right edge, and no page scroll.

### F6 (Low, observation)
- Assignment form, Math, 60 lessons Nov 2 to Jan 29: "15 min a day / 30 min a day / ..." chips, then "Math usually takes about 40 min a lesson (about 37 min a day here)." The ticket asks for exactly this (daily figure at the assignment's pace, per-unit figure in the hint), so S7-17 is met. S7-13 (#8) flagged the same mix as confusing. The hint now explains it.

### F7 (Low, observation)
- `t-fresh-thismonth-360.png`: an empty "October 2026" with a lone "Oct" label and Today pill. Year zoom on the same family is fine (`t-fresh-default-360.png`). A line like "Nothing planned this month." would match S6b-09's empty state.

## Verified, per ticket

### S7-01: copy a year into a new year. Meets "Done when"
| Case | Result |
|---|---|
| Ana's 62 assignments, 2027-08-16 to 2028-08-21 (+371 days) | "62 assignments to copy", two bulk requests (50, 12), 124 assignments afterwards |
| Across the leap day | Leap A 2028-01-10 to 2028-02-29 became 2029-01-15 to 2029-03-06; Leap B (Feb 21 to Mar 10, 2028) 2029-02-26 to 2029-03-16; Leap C (Mar 1) 2029-03-07. All +371 days exactly |
| Fields copied | Leap B kept `weekdays [1,3]` and weight 3; Leap C kept null and null; the shared Ana+Ben assignment kept both children; units and titles unchanged |
| 104 sources, second chunk forced to fail (browser route, HTTP 500) | "Part 2 of 3 didn't save: Couldn't save. Please try again. 50 copies were created." The panel listed 54 left; Copy again sent chunks 3 and 4 only (50 and 4); final total was exactly 124 + 42 + 104, no duplicates (`t-copyyear-partial-360.png`) |
| Empty state | "Pick both days to choose what to copy. Only the plan is copied, not progress." Nothing listed until both are dates |
| 320, 360, 390, 1280 | no sideways scroll, controls 44 px or more |

Demo family copy (Aug 31 to a later start) was not run separately; the t2 runs cover weights and days.

### S7-02: copy to another child. Meets "Done when"
- Ana to Cara (empty child), subject History, new start Sep 4, 2028: 42 History assignments, one bulk request, every copy has Cara's id alone, `weekdays` null, dates shifted so the earliest starts Sep 4. Originals unchanged. Target list is "Choose a child…, Ben, Cara" (never Ana). Source Cara reads "Cara has no assignments to copy." and offers no list. Shared Ana+Ben assignments show as "Ana, Ben" and copied for Cara alone.
- 320 shot: `t-copychild-ben-320.png`; the three copies of "Shared Ana+Ben" differ only by date, which is how they are told apart.

### S7-03 / S7-04 / S7-05: zoom views. Meet "Done when" (F1, F2, F3)
| Case | Result |
|---|---|
| Default row | Year, Fall, Spring, This month, plus Edit; Edit is quiet text |
| Hide Fall and Spring, add Term 1 to 3, reorder | Row is Year, This month, Term 1, Term 3, Term 2 after moving Term 3 up (F2) |
| 6-view limit | With Year, This month and 4 custom views, Add a view is disabled with "You can show up to 6 views."; the hidden Fall switch is disabled too |
| Selected view deleted | Row loses it and Year is pressed |
| Selected built-in hidden (This month) | Year is pressed |
| Reload | row persists (stored on the family) |
| Custom view of 5 weeks | draws in daily detail (`t-geo-daily-360.png`) |
| View outside the grid | whole grid (F3) |
| Widths | zoom row scrolls inside itself, page `scrollWidth` equals the viewport at 320, 360, 390 |

The API rules (hidden subset, 5 custom, 400 days, 6 shown, unique ids) were not driven over HTTP by me beyond the Save path; the gate's 953 api tests cover them.

### S7-06: preview skips finished work. Meets "Done when"
Demo family, today 2026-10-31, a Wednesday event: the 20 rows include current work only; "Aesop's Fables" (ended Sep 11), Treasure Island, The Hobbit, A Child's Garden and Times tables are not listed.

### S7-07: template adds no breaks. Meets "Done when"
Sabbath template on a family with no days off, Aug 17 2026 to May 28 2027: "11 breaks to add". Applied, then opened again with the same dates: "Nothing new to add: these breaks are already in your days off.", Add breaks disabled (`t-template-nothing-new-360.png`). The "No breaks in this range." variant was not driven.

### S7-08: days off left out. Meets "Done when"
Whole-family day off on Aug 14 with the saved days off: first day Aug 17 shows "11 days off will be saved" and "1 day off before Aug 17, 2026 isn't included."; Aug 14 shows 12 saved and no line; Aug 15 shows the line again (`t-save-template-left-out-360.png`).

### S7-10: very slow pace. Meets "Done when"
A 100-page book with check-ins of 0.1 (week of Sep 7) and 0.2 (Sep 14): Plan shows "Crawling reader won't finish this school year at this pace." The exact 44.4 / 44.6 case could not be reproduced by value (it depends on dates the finding did not record); the same shape (positive progress too small to finish) is what S7-10 handles. I also tried 44.4 and 44.6 on 2026-09-14 and -21: no line appeared, so that exact pair does not reach the marker on this data.

### S7-11: same days store no history. Meets "Done when"
Database checked after each PATCH on a started assignment in a Mon to Fri family: null to Mon-Fri stores nothing; Mon-Fri to null stores nothing; null to Mon-Thu stores `weekdays_from` 2026-10-26 with a null `previous_weekdays`; back to Mon-Fri clears both. On a Tue/Thu subject default, null to Tue/Thu and back store nothing.

### S7-12: tap-target width. Meets "Done when" (F5)
`TAP_WIDTH=320` logs "Viewport width: 320 px" and passes; 360 passes; `TAP_WIDTH=100` stops with "TAP_WIDTH must be a whole number from 280 to 1600". Run with `TAP_EMAIL=t3@example.com` so the event form was measured. `CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` was needed.

### S7-15: edit bar at 320. Meets "Done when"
Edit bar on Math 5 at 320, 359, 360, 390: the page `scrollWidth` equals the viewport, the furthest control edge is 316, 355, 356, 386, Start and End each 44 px high. At 320 the fields stack (`t-editbar-320.png`); 360 and up are side by side.

### S7-16: new subject and Add. Meets "Done when"
Select "New subject…" (after Nature Study): the select shows "New subject…". Typed "Zebra Studies", filled the form, pressed the form's Add: one POST /subjects (colour #2f6fb0) then one POST /assignments under its id; "Zebra Studies · Mia" appears in the list. A blank (spaces) new-subject name sends nothing and shows "Pick a subject." The failure message for a name that the API refuses was not driven.

### S7-17: one way to say a subject's usual effort. Meets "Done when" (F4, F6)
- Subjects list: Math "about 40 min a lesson". Subject form: section "Usual effort (optional)", chips "Light · 15 min a lesson ... Very heavy · 60 min a lesson", caption "About 30 min a lesson. The bar shows 1 lesson a day.", picker label "1 lesson a day, about 40 min a lesson". The same 40 appears on list and form.
- Assignment form, Math: "Math usually takes about 40 min a lesson (about 37 min a day here)." Cards stay "about N min a day" at their own pace (Math 5: 150 lessons, about 32 min a day).
- A text, label, title and placeholder search for "bar width", "weight" and "thickness" on Subjects, the subject form, Assignments and the Add form found nothing.

### S7-18: heavier days stay heavier. Meets "Done when"
Geography for Frank, five school days each, in a 5-week custom view (daily detail). Band heights at 360, 390 and 1280 px, identical at each:
| Pages a day | 20 | 60 | 100 | 300 | 1,000 |
|---|---|---|---|---|---|
| Height (px) | 56.0 | 74.7 | 82.4 | 98.4 | 112.0 |

60 to 100 is 7.7 px, 100 to 300 is 16.0, 20 is unchanged, nothing over 112. Sprint 6b's F2 (flat from 100) is fixed (`t-geo-daily-360.png`).

### S7-19: labels don't collide. Meets "Done when"
Axis labels read from the SVG at 320, 360 and 390 px on the new family (This month in November, Year zoom): no two overlap (for example at 360, "23" ends at 197 and "Dec" starts at 236). In the earlier problem case (a family whose first assignment starts Nov 2) Year zoom shows "Oct 2 9 16 23 Dec 7 14" cleanly. The Today line starts at the first lane's bar top, under its name (`t-fresh-default-360.png`), and does not run through any lane name on the demo family at Year, Fall, Spring and This month (`t-zoom-*-360.png`, `-1280.png`). Sprint 6b's F7 is fixed.

### S7-20: dragging off. Meets "Done when"
Demo family. Mouse (1280 px): press and move 120 px on a Math 5 bar, and a resize drag from its end edge: no PATCH is sent, cursor is `pointer`, a click still opens the edit bar (Start, End, More). Touch (390 px, CDP touch events): a horizontal drag on a bar sends nothing and does not select; a vertical swipe starting on a bar scrolled the page 0 to 248 px; the mouse wheel over a bar scrolls; the SVG's `touch-action` is `pan-x pan-y`; a tap selects (More appears). Turning the switch on was not tried (the unit tests do).

### S7-21: calm bars. Meets "Done when"
Year, Fall and Spring on the demo family at 360 and 1280 (`t-zoom-year-*`, `-fall-*`, `-spring-*`): bars are even bands with gentle swells at the ends, no jagged steps, a heavier subject (Math 5) still thicker than a lighter one, and all subjects a flat strip. This month shows the real daily steps (`t-zoom-this-month-360.png`: Math 5 steps, History blocks with gaps on break days). Bars start and end in the right week. The one-week Geography bars at Year zoom draw as separate blocks of their own height, as they are separate assignments. A two-week heavy sprint inside one long assignment was not built; I judged by eye on the demo family only.

## Re-run of earlier findings

| Finding | Result |
|---|---|
| Sprint 5 L1 (preview lists finished work) | **Fixed** (S7-06, above) |
| Sprint 5 L2 (Add breaks with nothing to add) | **Fixed** (S7-07) |
| Sprint 5 L3 (tap script fixed at 360) | **Fixed** (S7-12), with F5 as a coverage note |
| Sprint 5 O4 (days off before the year dropped silently) | **Fixed** (S7-08) |
| Sprint 4b L6 (very slow pace gives no line) | **Fixed** (S7-10), same-shape case |
| Sprint 4b N1 (null vs a full week stores history) | **Fixed** (S7-11) |
| Sprint 6b F1 (edit bar End clipped at 320) | **Fixed** (S7-15) |
| Sprint 6b F2 (soft cap flat above 80 a day) | **Fixed** (S7-18) |
| Sprint 6b F3 (New subject field ignored by Add) | **Fixed** (S7-16) |
| Sprint 6b F4 (one effort, three numbers) | **Mostly fixed**: the subject says per unit, cards say per day, and the form's hint ties the two together (F6 remains) |
| Sprint 6b F5 ("Default bar width", chips without "a day") | **Fixed**: "Usual effort", chips "a lesson" (F4 is new, in the minutes unit) |
| Sprint 6b F7 (axis labels touch, Today line through a name) | **Fixed** (S7-19) |

## Screen tests (docs/DESIGN_DIRECTION.md)

| Screen | Five seconds | One job | No duplicates | Parent's words | Empty state | Phone first |
|---|---|---|---|---|---|---|
| Assignments with the two Copy panels | Yes: the panel says what is copied and that progress is not | Yes | Add, Add several, Import CSV, two Copy panels: six ways in, as in S7-13 | Yes ("Copy", "New start date"); "assignments to copy" | Cara: "has no assignments to copy"; no dates: a line of instructions | Yes at 320 to 1280 |
| Zoom row and Zoom views sheet | Yes; Edit is quiet | Yes | Year, built-ins, own views, All and child chips on one screen | Yes | Only Year left: Edit still shown | Row scrolls inside itself; switches small (F1) |
| Timeline (Year, Fall, Spring, This month) | Yes | Yes | None new | Yes | Empty month is bare (F7) | Yes |
| Timeline edit bar | Yes | Yes | Typing dates and dragging no longer overlap (dragging is off) | "Heavier", "Lighter", "Reset to original" | n/a | Clean at 320 |
| Subjects and subject form | Yes | Yes | None | "Usual effort", "a lesson" (F4 for minutes) | Chips only on an empty page | Yes |
| Assignment form | Yes | Yes | Inline subject Add no longer collides with the form's Add | "min a day" and "min a lesson" (F6) | "Choose a subject…" and "New subject…" | Yes |
| Days off with template panels | Yes | Yes | None | Yes | Clear lines for nothing to add and for what was left out | Yes |
| Plan | Weak when nothing is due (S7-13 #2, still open) | Yes | Briefing line plus check-in card | "won't finish this school year at this pace" | n/a | Yes |

## S7-13's report (docs/reviews/cm-term-run.md)

What it did well: it moved "today" honestly through six weeks, found the most useful problems of the sprint (Undo, the empty Plan, no "finish later"), and said what it did not do.

- **Its findings 1 to 7 have no Sprint 7 ticket.** No ticket in the README covers the half-undone adjustment, the blank Plan, "let it finish later", Lighter on a late subject, "4 of 2 ch.", the briefing moving after a weekday change, or per-row dates in Add several. The sprint closes with the report's own verdict, "not yet without help", unaddressed. Someone should decide where they go.
- **Finding 1 is real and I confirmed why.** I saved a three-row week adjustment through `PUT /api/week-overrides` three times for Frank, week of Nov 2: all three rows exist, and `GET /api/undo` names only "Adjusted Science fair project for Frank, week of Nov 2". The store keeps one undo entry per family, and each PUT replaces it, so Undo can only reverse the last row. The sheet sends one PUT per row (`WeekAdjustment.tsx`). The report's wording ("reverts only one row") is right; its steps could be shorter.
- **Finding 4 is partly out of date.** The report says the toast reads "Changed the weight of Fractions ...". No such text exists in the web source now (search for "weight of"); that wording was removed in S6b-13. The first half of the finding (Lighter changes effort, not the amount of work) still holds.
- **Finding 9 (common-subject chips vanish after the first) conflicts with the 6b pass,** which saw the other 11 chips stay after three were tapped. Both may be right (the chips are an empty-state feature). My test of t2 (three subjects) showed none on the Subjects page, and the form's select still offers the common group.
- **Finding 13's unidentified 44 px control.** Not found by the tap script (which measures real controls and exempts inline links) on any of the 26 screens at 320 or 360, so it is probably something the script exempts, or a visually hidden control. I did not chase it.
- **Not covered (it said so):** "Copy to a new year" (the headline of S7-01), the edit bar's Copy and the smoke scripts. It used custom zoom views but did not look at the Edit sheet itself at phone width (my F1). Dragging was off.
- It says "Moving 'today' ... the API has no supported setting" and used a launcher outside the repo. That is a fair gap (no way for a tester to age a family). My own pass could not either.

## Sprint 7 decisions (docs/progress/sprint-7.md)

Agreed: no default dates in the copy panel; offering only active-child, active-subject, in-range assignments; grouping by children rather than splitting a shared assignment; chunks of 50 stopping at the first failure with only the rest offered again; copied titles unchanged; the 014 migration number and the API-checks-contents split; "That's about" hint text kept; S7-06 checking both plans; S7-08 counting by start day; S7-10 returning a marker and keeping `forecastOutcome` beside the old function; S7-11 reading null as the school days; S7-15 stacking instead of shrinking; S7-16 dropping a weekday default marked for the old subject; S7-18's constants (56 knee, 112 max, ln scale 40); S7-19 hiding the label, not the tick; S7-20's constant approach and keeping the hook; S7-21 replacing `cleanSeries` in the layout.

Disagree, mildly:
- **S7-05 row order.** Following S7-04 is defensible, but the Done-when in S7-05 reads the other way; it should be one decision, made by Will (F2).
- **S7-05 "all three built-ins listed even when the grid doesn't offer Fall and Spring".** Fine for setting views in advance, but the sheet then shows switches that do nothing yet for a family with a one-year grid; a short hint would help.
- **S7-17 "about 1 min a minute".** The notes call it honest but odd; for minutes subjects I would say the unit differently (F4).
- **S7-05 and S7-21 were recorded as "not checked in a browser".** I checked both; they work, with F1 on the sheet.
- **S7-21 leaving `cleanSeries` in place, unused.** Harmless, but it leaves tested code nobody calls.

## Not verified
- Turning `BAR_DRAG_ENABLED` on again, and a real pointer-and-finger drag on a phone (CDP touch events only).
- Copy to a new year on the demo family (weights and days were checked on t2), and Copy to another child with a source child whose assignments include an archived subject or child.
- The "No breaks in this range." message, the failure message of a refused new subject, and API 400 messages for zoom views from the browser.
- The exact 44.4 / 44.6 briefing case (see S7-10).
- A two-week heavy sprint inside one long assignment at Year zoom.
- Real devices, Safari, dark mode; Chromium at 320 to 1280 px only.
