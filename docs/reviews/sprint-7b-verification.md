# Sprint 7b verification (fixes from the Charlotte Mason run, the Sprint 7 tester and the independent review)

Tester verification of S7b-01 to S7b-07 and S7b-09 to S7b-14 in `docs/tickets/sprint-7b-fixes/`, branch `claude/test-coverage-analysis-6dehbu`, head 4ee4ac2. This is S7b-08. Date: 2026-10-31. No source or test files were changed; the only file added is this report.

> **Independence note:** This pass was run by a separate tester agent briefed by the coordinating session that wrote the tickets and directed the build. It is not an independent review by a different person.

## Result: FAIL on one ticket, PARTIAL on three; the gate is ALL GREEN

- **S7b-03 fails** its screen: the new "ahead" text breaks the check-in row at every phone width (N1, High).
- **Partial:** S7b-02 (the sheet preselects the wrong preset, N2), S7b-09 (an adjustment in the last week still rewrites every earlier week, N4), S7b-13 (the review's own case still puts Thanksgiving and Christmas break on wrong dates, N3).
- **Meets "Done when":** S7b-01, 04 (with N5, N6), 05, 06, 07, 10, 11, 12, 14.
- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate). Counts, labelled from the gate's log: **971 api** (67 files), **941 web** (74 files), **120 db** (18 files), **409 engine** (29 files), and 409 engine in each of the 7 `test:tz` zones.
- `scripts/smoke` `tap-targets` at `TAP_WIDTH=360` (signed in as a writable copy of the demo family, with `CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`): all 31 screens and panels, including the two Copy panels and Zoom views, print "none"; ends "No undersized controls on the listed screens."
- Nine new findings (N1 to N9 below): 1 High, 4 Medium, 3 Low, 1 Low observation. 13 tickets: 9 meet, 3 partial, 1 fail.

## Setup

- Scratch database `hh_s7b_dev` (Postgres 16, role hh), API on 127.0.0.1:3000 (the log says "api listening on http://127.0.0.1:3000"; `/proc/net/tcp` shows it bound to 127.0.0.1 only and a request to the machine's other address is refused), Vite on 127.0.0.1:5173. Chromium via Playwright at 360 px (mobile, touch) and, for width checks, 320, 390, 440, 768 px. Nothing was exposed, no tunnels, nobody contacted. The database is dropped and the servers stopped at the end.
- Families, all made with the repo's `seed()` and the app's own API: `p@example.com` (writable copy of the demo family: Frank and Margaret, 20 assignments, co-op on Tuesdays skipping Science, Thanksgiving, Christmas and spring breaks); `b@example.com` (demo copy, grown to 570 assignments for the pace-call test); `n@example.com` (empty, then Clara, Dora and Eve with check-ins for the late and forecast checks); `z@example.com` (one child, one book starting Nov 2, for the empty-month and zoom checks); `c@example.com` (empty; used with a clock).
- "Today" was the real Sat 2026-10-31. For the one check that needs weeks to pass (S7b-04, adjusted weeks), I ran the API with an injected clock (a launcher kept in the scratchpad, outside the repo, bound to 127.0.0.1) and moved it forward week by week, then went back to the real clock.
- Screenshots (not in the repo): `/tmp/claude-0/-home-user-Homeschool-Hub/7a240ed6-3fb3-5430-b251-2b10ddef71fc/scratchpad/s7b/shots/`, named below. Per the ticket's step 1 they were meant for `docs/progress/screens/sprint-7b/`; I kept them out of the repo on instruction, so the developer can copy the ones they want.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| N1 | High | S7b-03 | An "ahead" check-in row ("4 chapters (1 more than planned)") squeezes the assignment title to about 12 px wide, one letter per line, and widens the page past the phone screen (420 to 465 px at a 390 px phone) |
| N2 | Medium | S7b-02 | Update time estimate preselects "15 min a day" while its own line says "We estimated about 30 min a day"; Save untouched would halve the estimate |
| N3 | Medium | S7b-13 | The review's own case still fails: a saved week-long "Thanksgiving break" (Nov 23-27) lands on Nov 8-12 and "Christmas break" (Dec 21 - Jan 1) on Dec 6-17 |
| N4 | Medium | S7b-09 | A "keep the end date" adjustment on the last week of an assignment still rewrites every earlier week, including past weeks (F-02 survives in that case) |
| N5 | Medium | S7b-04/05 | A late assignment that has a week adjustment loses its "will finish late" line when its days change, so a late book looks on time |
| N6 | Low | S7b-04 | A weekday change with no new check-in still nudges the forecast (11 weeks late becomes 10; the end date moves a day) |
| N7 | Low | S7b-01 | At 360 px the undo bar cuts its label to "Adjusted 3 assignments for F... Undo", so the child and week the ticket asked for are not readable |
| N8 | Low | S7b-05 | The undo label reads "Moved Fractions's end to Aug 27." (a title ending in s gets 's) |
| N9 | Low (observation) | S7b-02 | Frank's next suggestion after "Update time estimate" is the average of his recent choices for that unit, not the new figure, when he has other history |

### N1 (High): the "ahead" text breaks the check-in row
- **Reproduce:** demo-family copy, Plan, "This week", Frank's "Last week" card. Tap any row (for example The Hobbit), then **More** (a tap on More adds one, so the row reads "4 chapters (1 more than planned)"). Same for History spine, Math 5 and Piano practice.
- **Actual:** the row head is a single line of title, plan range and state. The new text is long, so the title column collapses: The Hobbit's title is 12 px wide and 186 px high, History spine's 12 x 278, Piano practice's 10 x 278. The page gets wider than the phone: with a 390 px phone, document width 435 (The Hobbit), 465 (History spine, Math 5), 420 (Piano practice); at 320, 360 and 390 the layout viewport grows to 435; at 440 the title is still 12 px wide; only at 768 px is it fine (title 170 px). See `s03-more-open-360.png`, `s03-ahead-390.png`.
- **Expected:** S7b-03 asks for plain wording; DESIGN_DIRECTION's phone-first test (nothing scrolling sideways, one-handed at 360) fails on the main check-in screen.
- **Wording itself is right:** the row reads "5 lessons (1 more than planned)", "90 minutes (1 more than planned)", behind "3 of 4 lessons", "85 of 89 min", "2 of 3 ch.", and "Missed", with no "4 of 2". The fault is the layout, not the words (wrap the state under the title, or let the title keep a minimum width).

### N2 (Medium): wrong preset preselected
- **Reproduce:** Timeline, tap Black Beauty (Frank, 240 pages, Nov 16 - Dec 18, no weight set), More, Update time estimate. Wait 3 seconds.
- **Actual:** "We estimated about 30 min a day (about 15 pages a day)." and "15 min a day" is the chosen chip (`s02-sheet-360.png`, `s02-sheet-wait-360.png`; checked radio still 15 after 100, 500, 1500 and 3000 ms). Probable cause: `EstimateForm` seeds its choice from the pace it has on first render (the weekday count, about 9.6 pages a day, which gives about 19 min and so the 15 chip); the real pace arrives from `/api/plan/pace` afterwards and the text updates, the chip does not.
- **Expected:** "the nearest to the current estimate preselected" (S7b-02 step 2): 30. Pressing Save without touching anything would write a 15-minute estimate.
- The main flow does work when a parent picks a chip: 45 then Save sent `{"weightPerUnit":1.5}`.

### N3 (Medium): saved week-long breaks still land on wrong dates
- **Reproduce:** demo-family copy, Days off, Save as a template ("My year", first day 2026-08-31), Use a template, pick it, first day 2027-08-16.
- **Actual:** "Labor Day: Sep 6, Thanksgiving break: Nov 8-12, Christmas break: Dec 6-17, Spring break: Feb 28 - Mar 3" (`s13-apply-360.png`). Only Labor Day is stored by holiday key. The family's Thanksgiving break (Nov 23-27) and Christmas break (Dec 21 - Jan 1) are not exactly the engine's holidays (Thanksgiving is Nov 26-27, Winter break Dec 24 - Jan 1), so they shift by offset and miss the real holidays by two to three weeks. This is the review's own F-06 case (it saw the same Thanksgiving and Christmas dates, 15 days early) and S7b-13's "Done when" asks for Nov 25-26 and Dec 24 - Jan 1.
- **When it works:** breaks entered as exactly the holiday (Thanksgiving Nov 26-27, Winter break Dec 24 - Jan 1, Labor Day) come out right: "Labor Day: Sep 6, Thanksgiving: Nov 25-26, Winter break: Dec 24 - Jan 1", and a Monday-Friday spring break stays Monday-Friday (Feb 28 - Mar 3, 2028; added for real, undo bar "Added 4 days off"). So the code does what the ticket says; the ticket's rule (exact match only) leaves the most common parent entry, a whole week around the holiday, unfixed. Needs a decision: match a break that contains a holiday (nearest to it), or warn in the preview.

### N4 (Medium): the last week still rewrites the past
- **Reproduce:** demo-family copy, History spine for Frank (140 lessons, Sep 8 - May 14). `PUT /api/week-overrides` for the week of May 10, 2027 with plannedUnits 2, mode keepEndDate. Compare `/api/plan` before and after.
- **Actual:** every earlier week rises: Sep 14 to Apr 26 each 4.34 to 4.452 (and to 4.516 when the last week is set to 0), the week of Sep 7 3.255 to 3.387, including this week (Oct 26) and last week. Units are conserved and nothing is unplaced. In a coming-week adjustment (Nov 2) the past is untouched (below), so only the last week is affected.
- This is the documented decision in `docs/progress/sprint-7b.md` ("the last week ... still pulls the rest back ... Say if Will would rather it showed as work that doesn't fit"). My view of how it feels to a parent: surprising. The parent lightens one trip week at the very end and the plan quietly changes weeks that are already done, on screens like last week's card ("Lessons 25-30" would change), which is exactly what F-02 complained about and what S7b-09's Goal forbids ("every week before the adjusted one keeps exactly the amounts it had"). Asking for more than fits in the last week is clamped to what is left (12 requested gave 5.425, nothing changed), which is fine. Suggest only changing weeks from today forward, and showing the rest as "doesn't fit" or asking.

### N5 (Medium): the late line vanishes after a weekday change
- **Reproduce (needs weeks to have passed; I used a clock):** child Eve with two 300-page assignments, Sep 7 - Jan 29, both behind; the first has a week adjustment (week of Sep 21 set to 0). Plan shows both "will finish about 2 to 3 weeks late" (the adjusted one 3 weeks, Feb 16, the control 2 weeks, Feb 15; the adjusted flat week did not count against the pace). Now PATCH the adjusted assignment's days to Mon-Thu (or Mon and Wed).
- **Actual:** its line and Move button disappear from Plan (`/api/plan` says weekdaysFrom 2026-10-12, previousWeekdays null, end unchanged). The control without an adjustment, with the same weekday change, keeps its line unchanged, as S7b-04 wants. Resetting the days brings the line back.
- **Expected:** a book still late, with fewer days, is not on time.

### N6 (Low): the forecast is not quite unchanged by a weekday change
- Dora's "Reading list" (300 pages, behind): baseline "about 11 weeks late, Move end to Apr 13, 2027". After days Mon-Thu with no new check-in: "about 10 weeks late, Apr 12". Mon, Wed, Fri: also 10 weeks, Apr 12. Back to Mon-Fri: 11 weeks, Apr 13. A day's difference that crosses a week rounding. Far better than the report's 5 to 7 weeks, so S7b-04 meets its "Done when" in spirit (the Eve control above did not move at all).

### N7 (Low): the undo label is cut off at 360 px
- After saving a three-row adjustment the bar reads "Adjusted 3 assignments for F... Undo" (`s01-after-save-360.png`). The full label is correct in the API and the screen reader copy ("Adjusted 3 assignments for Frank, week of Nov 2."), but on screen the week is never visible. Let it wrap to two lines.

### N8 (Low): "Fractions's"
- "Moved Fractions's end to Aug 27." A title ending in s should read "Fractions'" or avoid the possessive ("Moved the end of Fractions to Aug 27").

### N9 (Low, observation): one update moves the suggestion partway
- S7b-02's "Done when" says Frank's next Literature book suggests about 45 min a day. The suggestion is the average of his last few weight choices for the unit (pages), whatever the subject. In my family Frank already had one earlier pages choice (about 30 min), so after Update time estimate to 45 the next form said "Frank usually does about 35 min a day" with 30 preselected (`GET /api/weights/suggestion`: 1.96 before, 1.73 after a 1.5 choice, back to 1.96 after Undo, two choices counted). With no other history it would be the new figure. This is how S2b-09 works, so it is not a defect; the sheet's line "Frank's next Literature books will start from this too" promises a bit more than it does.

## Verified, per ticket

### S7b-01: undo a whole week adjustment. Meets "Done when"
Frank, week of Nov 2: History spine down one, Math 5 down one, Science 5 up one, Save. One request: `PUT /api/week-overrides/batch` with three `set` rows. The bar read "Adjusted 3 assignments for Frank, week of Nov 2." (cut off on screen, N7); `GET /api/undo` has the full label. Overrides for the week went from 1 row to 4. Tap Undo: back to the original 1 row, and the per-week plan for every assignment equals the pre-save plan exactly (compared as JSON). The single-row `PUT` still works and has its own undo (used in later checks).

### S7b-02: Update time estimate. Meets, with N2 and N9
- More menu: "Update time estimate | Reset to original" (no Heavier or Lighter). Sheet: title, "We estimated about 30 min a day (about 15 pages a day).", "How long is it actually taking?", 15/30/45/60/Custom, "Frank's next Literature books will start from this too.", Save, Cancel (`s02-sheet-360.png`). Pace figure is right: 240 pages over 16 working days (Tuesday co-op skips Literature, Thanksgiving week off).
- Black Beauty, 45 then Save: `PATCH {"weightPerUnit":1.5}`; thickness 15 to 22.5 (+50 percent), end date unchanged (Dec 18); bar "Updated the time estimate for Black Beauty." Undo: weight back to the default, thickness 15. The word "weight" does not appear anywhere on the page.
- Fails the preselection (N2). The "same pace" carry-forward is N9.

### S7b-03: say "ahead" plainly. Fails on layout (N1); wording meets
Wording checked in the browser for lessons, chapters and minutes (pages: unit tests in the gate only, no pages assignment was due last week): "5 lessons (1 more than planned)", "4 chapters (1 more than planned)", "90 minutes (1 more than planned)", then "6 lessons (2 more than planned)", "95 minutes (6 more than planned)" on a second tap; behind "3 of 4 lessons", "1 of 4 lessons", "2 of 3 ch.", "85 of 89 min"; on plan "As planned". "Finished" was not driven. See N1 for the layout.

### S7b-04: the forecast ignores deliberate changes. Meets, with N5 and N6
- Adjusted week left out: with the week of Sep 21 set to 0 and flat check-ins, Eve's adjusted assignment reads 3 weeks late (Feb 16), the control that made the same progress reads 2 weeks late (Feb 15). Counting the flat week would have put it about eight weeks late.
- Weekday change with no new check-in: control unchanged (2 weeks, Feb 15, for Mon-Thu and Mon, Wed); Dora 11 to 10 weeks (N6); an assignment with an adjusted week lost its line (N5).
- A deliberately light current week (week of Oct 26 set to 0) did not change Dora's line.
- The "no progress" half was not driven in a browser (engine tests only).

### S7b-05: a late line offers one next step. Meets (N8)
Clara's "Fractions won't finish this school year at this pace" shows **Move end to Aug 27, 2027** and a quiet **Keep Dec 18, 2026** (`s05-plan-late-360.png`). Move: `PATCH {"endDate":"2027-08-27"}`, the line goes, plan end 2027-08-27, bar "Moved Fractions's end to Aug 27." Undo: end back to 2026-12-18 and the line returns. Keep: the line goes and stays after a reload (stored on the device). An "about N weeks late" line (Dora, Eve) has the same two buttons. The ticket's "last school day" is not implemented (no school-year dates exist); the developer noted it and a forecast more than 26 weeks late gets the Move button to the forecast date, as built.

### S7b-06: Add several, dates per row. Meets
Three Literature books with Dates toggled on rows 2 and 3 (prefilled from the shared dates): one `POST /api/assignments/bulk`, Book A Sep 6 - Oct 29, Book B Nov 1 - Dec 17, Book C Jan 3 - Feb 25, created with one Save. A row with end before start shows "The end date must be on or after the start date." under that row only (`s06-bad-dates-360.png`). The CSV template shows two example rows in sequence (checked by the web tests in the gate; not downloaded in the browser).

### S7b-07: the Sprint 7 tester's small findings. Meets
- F1: the three switches in the Zoom views sheet are each 336 x 44 px (label and switch one target).
- F3: with a custom view in 2035, selecting it shows "Nothing planned in Far future yet." over the grid; the sheet says "Not in this year's dates" for Fall and Spring (for a grid that does not span New Year).
- F4: Subjects, Music, Usual effort, Minutes: "Light · 15 min a day / Normal · 30 min a day / Heavy · 45 min a day", "About 30 min a day."; the assignment form for a minutes assignment reads "About 34 minutes a day" and "Usually about 34 min a day." No "min a minute" anywhere.
- F5: the tap-target script now lists "Assignments > Copy to a new year", "Copy to another child" and "Timeline > Edit zoom views" and passes at 360.
- F7: This month on a family whose work starts Nov 2: "Nothing planned this month." under the axis (`s07-empty-month-360.png`).

### S7b-09: week adjustments never change past weeks. Partial (N4)
- Review's reproduction (Frank, History spine, week of Nov 2 down to 2, keep the end date): every week before Nov 2 is identical (3.255 and 4.34 each), the week of Nov 2 is 2, later weeks rise 4.34 to 4.44, ends the same day, units conserved within rounding. Plan's "Last week" card still reads "Lessons 25-30".
- Two overrides (Nov 9 down to 1, Jan 11 up to 8): nothing before Nov 9 changed; Nov 9 is 1, Jan 11 is 8, the weeks after redistribute, nothing unplaced, end unchanged. Both undone one at a time.
- Last week of the range: see N4.
- Not driven: an override together with a later check-in (engine tests only).

### S7b-10: minutes a day counts the real days. Meets
- The review's case (Science, Frank, Nov 2 - Jan 29, 300 pages, Thanksgiving, Christmas break, Tuesday co-op skip): the form shows **"About 7.6 pages a day"** (`/api/plan/pace` answered for that draft). Picking 30 min a day saved `weightPerUnit 1.96`; the plan has 7.64 pages a day on 40 days, and 7.64 x 1.96 x 2 = 30 minutes. The list says "300 pages · about 30 min a day".
- F-11's case (Math, Frank, Jan 4 - Mar 26, 300 pages): "About 6.4 pages a day", tapping "30 min a day" posted weight 2.34, which is 30.03 min a day over 46.75 capacity days.
- Batched pace call with a large list: 300 assignments added to a demo family by bulk (6 requests of 50) took it to 320; the Assignments page made **one** `POST /api/plan/pace` with 320 drafts, every card shows "about N min a day", page ready in about 3.4 s. With 250 more (570 in all) it made two requests of 500 and 70 and all 570 cards showed minutes (about 5.3 s). A direct call with 500 drafts took 28 ms. No failure, no card left without minutes.

### S7b-11: copy to a new year. Meets
Demo copy, "This year's first day" 2026-08-31, "Next year's first day" 2027-08-16: first run "21 assignments to copy" (the three Book A-C rows starting in Sep 2027 are correctly not sources), Copy (21) made one bulk request (45 assignments in all), the bar read "Copied 21 assignments to 2027-28." Second run: "21 already copied." and nothing to copy. Undo from the bar: 21 removed, count back to 24, and the panel offers 21 again. Undo after a created assignment gets a check-in: 409 "That change can't be undone any more.", the assignment stays.

### S7b-12: copy to another child. Meets
Frank to Margaret, subject History: "1 already has Margaret." (the shared History spine) and no list. All subjects: "1 already has Margaret." and "Copy (15)"; copying gave "Copied 15 assignments to Margaret."; Undo removed all 15.

### S7b-13: saved templates keep holidays on their real dates. Partial (N3)
Holiday-matched breaks pass as described in N3; the demo family's week-long Thanksgiving and Christmas breaks do not.

### S7b-14: small fixes from the independent review. Meets
- F-04: after an end-date change the "Moved Black Beauty's end to Dec 22" bar is up; opening More hides it and the element at the Update time estimate item is the menu item (`s14-f04-360.png`); closing More brings the bar back.
- F-11: preset tap saves the exact amount (above); a suggestion above 240 min a day is set aside (a one-day 300-page assignment shows "Usually about 600 min a day" from the built-in default, not a learned "1950"; that built-in figure is itself over the cap but is not a learned one).
- F-12: choosing "Math" in a family that lacks it shows "Math (new)" and sends no request; Cancel leaves the subject list as it was ("Literature"). New subject... then Cancel: same.
- F-13: with a pushEndDate adjustment, the Assignments card for Math 5 reads "Aug 31, 2026 - May 21, 2027 . plan ends May 28, 2027"; The Hobbit without a push shows no extra text.
- F-14: the API listens on 127.0.0.1 (above); config test passes in the gate.

## Re-run of earlier findings

| Finding | Result |
|---|---|
| CM #1 (undo of a multi-row adjustment reverts one row) | **Fixed** (S7b-01), label cut on screen (N7) |
| CM #4 (Lighter/Heavier, engine word) | **Fixed** (S7b-02), preselect bug N2 |
| CM #5 ("4 of 2 ch.") | **Words fixed, layout broken** (S7b-03, N1) |
| CM #6 (forecast moves after a weekday change, counts a light week) | **Fixed** with caveats N5, N6 |
| CM #7 (one date range per Add several) | **Fixed** (S7b-06) |
| Sprint 7 F1 (switches 29 px) | **Fixed** (44 px rows) |
| Sprint 7 F3 (no-overlap view looks like Year) | **Fixed** |
| Sprint 7 F4 ("1 min a minute") | **Fixed** |
| Sprint 7 F5 (tap script misses panels) | **Fixed**; run passes at 360 |
| Sprint 7 F7 (empty This month) | **Fixed** |
| Independent F-01 (undo reverts one row) | **Fixed** |
| F-02 (keep-end-date rewrites last week) | **Fixed for coming weeks**; survives for the last week (N4) |
| F-03 (minutes a day ignores days off, breaks, skips) | **Fixed** (7.6 pages a day, 30 min on those days) |
| F-04 (undo bar over More) | **Fixed** |
| F-05 (copy to a new year duplicates) | **Fixed**, undoable |
| F-06 (templates move named holidays) | **Partly fixed** (exact holidays yes; week-long breaks around them no, N3) |
| F-07 (copy to another child duplicates a shared assignment) | **Fixed** |
| F-09 (undo label "weight") | **Fixed** ("Updated the time estimate for ...") |
| F-10 (zoom order, term start) | Not re-run in full; order is Will's decision as built, term clipping accepted. The Edit sheet and zoom row still work (F-10 only checked through the zoom views above) |
| F-11 (preset saves a different amount; 1950 min) | **Fixed** |
| F-12 (preset subject created early) | **Fixed** |
| F-13 (two sets of dates) | **Fixed** (stored dates and "plan ends") |
| F-14 (API binds 0.0.0.0) | **Fixed** |

## Undo checks (as asked)
| Change | Result |
|---|---|
| Week batch (3 rows) | Undo restores all rows and the plan exactly |
| Update time estimate | Undo restores the previous weight and thickness |
| End move ("Move end to ...") | Undo restores the end date and the late line returns |
| Copy to a new year (21) | Undo removes exactly the 21; refused (409) once a check-in exists |
| Copy to another child (15) | Undo removes all 15 |

## Screen tests (docs/DESIGN_DIRECTION.md), at 360 px

| Screen | Five seconds | One job | No duplicates | Parent's words | Empty state | Phone first |
|---|---|---|---|---|---|---|
| Plan check-in rows | Yes | Yes | None new | "(1 more than planned)" is plain | n/a | **No**: ahead rows crush the title and widen the page (N1) |
| Week adjustment sheet and undo bar | Yes | Yes | None | "Adjusted 3 assignments for Frank, week of Nov 2" | n/a | Label cut off in the bar (N7) |
| Plan briefing late line | Yes: one sentence, one button, one quiet link | Yes | None | "Move end to Aug 27, 2027", "Keep Dec 18, 2026" | Nothing late: no line | Yes |
| Update time estimate sheet | Yes | Yes | None (Heavier and Lighter are gone) | "min a day", no "weight" | n/a | Yes (44 px chips); wrong preselect (N2) |
| Add several with row dates | Yes | Yes | Shared dates plus optional per-row | Yes | Three blank rows | Yes |
| Copy panels | Yes: "21 already copied." | Yes | Same six ways in as before | "already copied", "already has Margaret" | Clear lines | Yes; tap targets all 44 px |
| Zoom views sheet and timeline empty states | Yes | Yes | None | "Not in this year's dates", "Nothing planned in Far future yet.", "Nothing planned this month." | Good | Yes |
| Days off template preview | Yes | Yes | None | Plain, but wrong dates for week-long breaks (N3) | n/a | Yes |

## Not verified
- Turning dragging back on; real devices, Safari, dark mode (Chromium at 320 to 768 px only).
- A pages-based "ahead" and the "Finished" row in the browser; the "no progress" line; an adjustment together with a later check-in (all covered only by the gate's tests).
- The downloadable CSV template (the web tests check its two rows).
- Copy to a new year across the leap day and on a family with archived children or subjects (S7 checked those; S7b-11 did not change them).
- A brand-new family's first screens (nothing in Sprint 7b changed them).
