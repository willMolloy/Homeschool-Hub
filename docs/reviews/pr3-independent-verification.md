# PR #3 — independent verification (Sprints 5, 6, 6b, 7)

> Screenshots named below are in [`pr3-independent/`](pr3-independent/).

- **PR:** willMolloy/Homeschool-Hub #3, head `claude/test-coverage-analysis-6dehbu` @ `e7eb099`, base `main`
- **Date:** Sat 2026-10-31 (America/Chicago). In the app, "this week" is Oct 26 – Nov 1 and the coming week is Nov 2–8.
- **Tester:** independent pass. I did not open docs/progress/ or docs/reviews/ before this report was written (see note under Method).
- **Viewports:** 360 px and 440 px. Headless Chromium (Playwright) with mobile mode and touch on.
- **Sprints 7b and 8 are tickets only.** S6b-02, S6b-03 and S6b-11 were moved to Sprint 8, so I scored them "not testable". S7-09 is marked not needed. S7-20 turns bar dragging off, so the "drag a bar" step of S6-08 doesn't apply.

## Setup and method

- **Clone:** fresh clone at `/workspace/hh-tester`, local branch `pr3` from `pull/3/head`.
- **Harness changes (local only, never committed):**
  - `apps/api/src/server.ts`: `host: "0.0.0.0"` changed to `"127.0.0.1"`, because the API hard-codes listening on all interfaces.
  - Added `.env` and `apps/web/vite.tester.config.ts`.
- **Database:** no Docker or psql on the box, so I ran my own Postgres 16 from existing embedded binaries on 127.0.0.1:5442.
- **Servers:** API on 127.0.0.1:3300, web (Vite) on 127.0.0.1:5373. Nothing was public and no tunnels were used.
- **Data:** created only through the repo's seed code and the app's UI and HTTP API. No hand SQL.
  - `db/demo.ts --no-serve` (repo seed) gave `demo@example.com`, which is read-only for events.
  - The repo's `seed()` was called with `DEMO_FAMILY` for a writable copy (`parent@example.com`).
  - The repo's `seed()` was called with an empty family (`new@example.com`, Mon–Fri) for the first-run test.
- **Not run:** the full unit and e2e suites, because of the usage budget.
- **Independence note:** one `rg` search for `weightFromMinutesPerDay` printed two lines from `docs/progress/sprint-6.md` in its output. I didn't open the file. Those lines only describe S6-09 saving and didn't change any result below.

## Criteria (Done-when), per ticket

P = pass, F = fail, NT = not testable here or not tested (reason given).

| Ticket | Result | One-line reason |
|---|---|---|
| S5-01 Event preview endpoint | P | Wed event skipping Literature lists Literature's higher per-day amounts; Literature set back to Normal gives "No change to the plan"; editing previews against the stored version (Math skip→lighter shows 1.3 → 1.1). |
| S5-02 Plan change shown before saving an event | P | The list updates on every rule change, Save worked, and the preview never blocked Save. 360 px OK. |
| S5-03 Year-shape helpers | NT | Engine-only; checked only indirectly (built-in shapes and holidays preview correctly). |
| S5-04 Bulk days-off endpoint | P (partial) | Template apply posts `/blocked-ranges/bulk` and all 4 were created. Invalid-item and cross-family cases weren't run. |
| S5-05 Apply a calendar template | P (partial) | Custom 4 on / 1 off from 2027-08-16 previews "Break: Sep 13–19" plus Labor Day Sep 6. An exact re-apply creates nothing. Not every built-in shape was applied. |
| S5-06 Saved templates stored | P (partial) | Round-trips: saved, then listed under "Use a template". Cross-family check not run. |
| S5-07 Save this year as a template and reuse it | P* | Breaks shift by exactly the start-date difference. *But named holidays land on wrong dates (see F-06). |
| S5-08 Compact edit bar | P | At 360 px the bar shows Start, End, Copy, More with no sideways scroll. 390 px is out of scope. |
| S5-09 44 px tap targets | P | Only "Skip to content" (23 px tall) and 20 px checkboxes inside full-size labels fall short. |
| S5-10 / S6-11 / S6b-04 / S7-14 Tester passes | NT | Process tickets. |
| S6-01 Newest edit decides the mode | NT | Not isolated. |
| S6-02 Week adjustment endpoints | P | Set, replace, list and remove work; a past week is 400. Cross-family check not run. |
| S6-03 Adjust this or a coming week | **F** | Keep and push behave as described, but a keep-end-date change to a coming week rewrote last week's check-in ranges (F-02). |
| S6-04 Remove "Missed a day?" | P | No such control on This Week. |
| S6-05 Store original and last change | P | Reset works and a family has a single undo entry (GET /api/undo returns one). |
| S6-06 Record and undo the last change | **F** | A multi-row week adjustment is undone only partly (F-01). The undo itself isn't undoable (correct). |
| S6-07 Reset an assignment | P | Reset asks to confirm in plain words and POSTs `/reset`. Week adjustments are removed and restored by Undo. |
| S6-08 Undo and Reset in the app | P (partial) | Reset → confirm → Undo brings back the end date (2027-06-04) and the Nov 2 adjustment. Drag step N/A (S7-20). The undo bar covers the menu (F-04). |
| S6-09 Effort in time on the form | **F** | Weight math is right (engine 30/5/2 = 3; 45 min → 4.5 stored). But the day count ignores days off, breaks and event skips, so the minutes are wrong in any real year (F-03). |
| S6-10 Heavier / Lighter | P | Heavier ×2: built-in 10 → 12.5 → 15.63 (1.5625×). The suggestion for Frank and Literature chapters is 15.63. The second tap is blocked by the undo bar (F-04). |
| S6b-01 Effort table off This Week | P | No table. |
| S6b-02 Pastel bars on This Week | NT | Moved to Sprint 8. |
| S6b-03 Completed / Update check-in | NT | Moved to Sprint 8. |
| S6b-05 Simpler edit bar | P | Start, End, Copy, More; More holds Heavier, Lighter, Reset to original. No overflow at 360. |
| S6b-06 Soft-cap thick bars | NT | Pixel heights not measured. |
| S6b-07 Gentle pace check | P | 300 pages in 1 day shows "That's about 300 pages a day. Is that right?"; 60 days doesn't; Save still works. |
| S6b-08 Add a subject from the form | P | New family: picking "Math" and typing "Nature Study" both save under the new subject. |
| S6b-09 Empty calendar | P | New family's Timeline shows months, Today, "Nothing planned yet." and Add assignment; the first assignment appears in place. |
| S6b-10 Tighter bar spacing | NT | Not measured; no touching bars seen at Year zoom. |
| S6b-11 Home page and navigation | NT | Moved to Sprint 8. |
| S6b-12 Adjustment sheet in plain words | P | A coming week says "That week"; amounts are whole ("4 lessons"); nothing is repeated. |
| S6b-13 Effort in the parent's words | P (scope) | No "weight" on Assignments, Subjects or the form. The Timeline undo label still says "weight" (F-09). |
| S6b-14 Clearer undo labels | P (partial) | The label names child and week ("Adjusted Math 3 for Margaret, week of Nov 2."), but names only one row of a multi-row save (F-01). |
| S7-01 Copy a year into a new year | P* | 21 assignments shifted by the date difference, weights kept. *Re-running copies everything again with no warning (F-05). |
| S7-02 Copy to another child | P* | A History copy to Margaret creates one for her only and leaves the original alone. *It happily copies an assignment she already shares (F-07). |
| S7-03 Store zoom views | P | Valid views round-trip; hiding Year gives a clear 400; a 6th custom view gives "You can add up to 5 views of your own." |
| S7-04 Show custom and hidden views | P | Fall and Spring hidden; Term 1 shows; tapping Term 1 zooms to it (but see F-10). |
| S7-05 Edit the zoom views | **F** | The row reads Year, This month, Term 1, Term 2, Term 3, not "Year, Term 1–3, This month". Built-in views can't be reordered (F-10). |
| S7-06 Preview skips finished work | P | A new Wednesday event skipping Literature doesn't list Aesop's Fables. |
| S7-07 Template adds no breaks | P | The second apply shows "Nothing new to add: these breaks are already in your days off." and Add is disabled. |
| S7-08 Days off left out of a template | NT | Not run (time). |
| S7-09 Edit-bar scroll hint | NT | Marked not needed. |
| S7-10 Very slow pace briefing line | NT | Not run. |
| S7-11 Same days store no history | NT | Not run. |
| S7-12 Tap-target script width | NT | Dev script; not run. |
| S7-13 Charlotte Mason term | NT | Report ticket. |
| S7-15 Edit bar at 320 px | NT | 320 is out of my viewport scope. |
| S7-16 New subject + Add don't collide | P | Typed "Nature Study" then pressed the form's Add: POST /subjects, then POST /assignments under it. |
| S7-17 One way to say usual effort | P (partial) | Subjects show per-unit figures and the form hint shows per-day; no "bar width" text. Not compared figure by figure. |
| S7-18 Heavier days visibly heavier | NT | Not measured. |
| S7-19 Labels don't collide | P (visual) | No collisions seen at 360 on the new family's Timeline. |
| S7-20 Dragging off | P | A touch swipe and a mouse drag on a bar send no writes; a tap opens the edit bar. |
| S7-21 Calm bars at Year zoom | NT | Not measured. |

**Counts (56 tickets):**
- **P (including partial and starred):** 32
- **F:** 4 (S6-03, S6-06, S6-09, S7-05)
- **NT:** 20

### DESIGN_DIRECTION screen tests

| Test | Result | Reason |
|---|---|---|
| Five seconds | **F** | On Plan, a parent can't tell what each child does this week or next: only "Make an adjustment" buttons, plus last week's card (F-08). The Timeline passes. |
| One job | P | Each screen has a single main action (Plan: check in or adjust; Timeline: see or edit; Days off: add or template). |
| No duplicates | **F** | Copy to a new year and Copy to another child create duplicate assignments with no warning (F-05, F-07). Templates add a second "Labor Day" on the wrong date (F-06). |
| Parent's words | P (minor) | Plain language almost everywhere; "Changed the weight of The Hobbit." is the exception (F-09). |
| Empty state | P (weak on Plan) | Kids ("No children yet." + Add child) and Timeline (empty calendar + Add assignment) are good. Plan says only "Nothing planned this week." with no next step. |
| Phone first | P | No sideways overflow on any page at 360 or 440; touch targets OK. The undo toast covering the More menu is the exception (F-04). |

## Findings

### F-01 — High — Undo after adjusting several rows reverts only the last row
- **Viewport:** 440 (same at 360 for Frank)
- **Steps:**
  1. Plan → › to Nov 2–8 → Margaret → Make an adjustment.
  2. Math 3 −1, History spine +1, Save.
  3. Tap Undo.
- **Expected:** both rows go back, and the label covers both changes.
- **Actual:** each row is its own PUT. The label is "Adjusted Math 3 for Margaret, week of Nov 2." and Undo reverts only Math 3. History spine stays at 5 (pushEndDate, end date moved), and there's no undo left for it. The parent believes the whole save was undone.
- **Screenshots:** `adj-07-margaret-two-rows-440.png`, `adj-08-undo-bar-440.png`, `adj-09-after-undo-440.png`

### F-02 — High — "Keep the end date" on a coming week rewrites last week's check-in
- **Viewport:** 360
- **Steps:**
  1. Frank → Nov 2–8 → Make an adjustment.
  2. History spine down to 2, Keep the end date, Save.
  3. Look at the "Last week · Oct 19–25" card.
- **Expected:** past and current weeks are unchanged, and the work is spread only over later weeks.
- **Actual:** last week's card changes History spine from "Lessons 25–30" to "Lessons 26–30". Per-week units for the current and past weeks rise too (4.36 → 4.4 in `/api/plan`). Push mode doesn't do this.
- **Screenshots:** `adj-04-after-save-360.png`, `cp-05-plan-after-child-copy-360.png` (still showing "Lessons 26–30")

### F-03 — High — "Minutes a day" ignores days off, breaks and event skips
- **Viewport:** 360
- **Steps:**
  1. Add assignment: Science, Frank, Nov 2, 2026 – Jan 29, 2027, 300 pages, pick "30 min a day", Add.
  2. The family has Thanksgiving and Christmas breaks, and Science is skipped on Tuesday co-op.
- **Expected:** 30 min a day on the days Frank actually does Science.
- **Actual:**
  - The form says "About 4.6 pages a day", counting all 65 weekdays. `effort.ts` `schoolDaysBetween` counts only weekdays.
  - The plan places the work on 40 days at 7.6 pages a day, about 50 min a day.
  - The list still says "300 pages · about 30 min a day".
  - The same happens with a Jan 4 – Mar 26 span (spring break): the form says 5 pages a day, the plan uses 55 days.
- **Screenshots:** `eff-02-typed-360.png`, `eff-04-list-says-30-min.png`

### F-04 — Medium — The undo toast covers the More menu, so "Heavier" can't be tapped
- **Viewport:** 360 and 440
- **Steps:** Timeline → tap a bar → change End (or tap Heavier once) → open More.
- **Expected:** every menu item can be tapped.
- **Actual:** the "Moved Math 5. / Undo" bar sits over the Heavier item and takes the taps.
  - At 360 the first Heavier tap was swallowed.
  - At 440 the second Heavier tap was blocked after the first succeeded.
  - So S6-10's "tap Heavier twice" can't be done by touch without waiting for the toast to clear.
- **Screenshots:** `tl-03-undo-bar-covers-more-menu.png`, `tl-06-more-with-undo-440.png`

### F-05 — High — Copy to a new year duplicates everything when run again, with no warning
- **Viewport:** 360
- **Steps:**
  1. Assignments → Copy to a new year → this year 2026-08-31, next year 2027-08-16 → Copy (21).
  2. Open it again with the same dates.
- **Expected:** already-copied items are flagged or left out.
- **Actual:**
  - The second time it offers "Copy (42)": the originals plus last run's copies.
  - Copying gives 21 exact duplicates in 2027–28 and 21 more in 2028–29 (84 assignments in all).
  - The copy isn't undoable (undo still showed "Added 4 days off").
  - There's no delete, only archive one by one.
- **Screenshots:** `cp-02-new-year-choose-1-360.png`, `cp-02-new-year-choose-2-360.png`

### F-06 — Medium — Reusing a saved year template puts named holidays on the wrong dates
- **Viewport:** 360
- **Steps:** Days off → Save as a template (first day 2026-08-31) → Use a template → that template, first day 2027-08-16.
- **Expected:** holidays like Labor Day, Thanksgiving and Christmas land on their real dates, or the parent is warned.
- **Actual:**
  - Everything shifts by −14 days: "Labor Day: Aug 23", "Thanksgiving break: Nov 8–12", "Christmas break: Dec 6–17".
  - Applying the built-in shape later adds the real Labor Day (Sep 6), so the family has two.
  - This follows the ticket's letter, but no parent would want it.
- **Screenshot:** `do-04-apply-preview-1-360.png`

### F-07 — Medium — Copy to another child copies an assignment the target child already has
- **Viewport:** 360
- **Steps:** Copy to another child → from Frank → Subject History → to Margaret → Copy (1).
- **Expected:** History spine, already shared by Frank and Margaret, is left out or flagged.
- **Actual:** Margaret gets a second "History spine" (Sep 8, 2026 – May 14, 2027, 0 done). That doubles her History load and puts her behind straight away.
- **Screenshot:** `cp-04-to-child-1-360.png`

### F-08 — Medium — The Plan page doesn't say what the week holds
- **Viewport:** 360 and 440
- **Steps:**
  1. New family: add Rosie and two assignments starting Nov 2.
  2. Open Plan, then › to Nov 2–8.
- **Expected:** at a glance, what Rosie does that week.
- **Actual:** only "Rosie / Make an adjustment". On the demo family the only content is last week's check-in card, which is also shown when viewing Nov 2–8. The table was removed (S6b-01) and the replacement (S6b-02) was deferred, so This Week is effectively blank. Fails the five-seconds test.
- **Screenshots:** `nf-08-plan-360.png`, `nf-09-plan-next-week-440.png`, `adj-01-next-week.png`

### F-09 — Low — An undo label uses the engine word "weight"
- **Viewport:** 440
- **Steps:** Timeline → tap The Hobbit → More → Heavier.
- **Expected:** parent's words, e.g. "Made The Hobbit feel heavier."
- **Actual:** "Changed the weight of The Hobbit."
- **Screenshot:** `tl-06-more-with-undo-440.png`

### F-10 — Low — Zoom views can't be ordered around the built-ins, and a term starts at the school-year start
- **Viewport:** 360
- **Steps:**
  1. Edit zoom views → hide Fall and Spring → add Term 1 (Aug 17 – Nov 6), Term 2 and Term 3 → Save.
  2. Tap Term 1.
- **Expected:** the row reads Year, Term 1–3, This month (S7-05), and Term 1 shows Aug 17 – Nov 6.
- **Actual:** the row reads Year, This month, Term 1, Term 2, Term 3, and only custom views have Up/Down. Term 2 and 3 are cut off at 360 ("Ter…") until scrolled. The Term 1 view starts around Aug 31 (no "Aug" on the axis).
- **Screenshots:** `zv-02-three-terms-360.png`, `zv-03-term1-view-360.png`

### F-11 — Low — A preset minutes choice can silently save a different amount
- **Viewport:** 440
- **Steps:**
  1. Frank has a learned pages weight of 3.25.
  2. Add a 300-page, 60-school-day Math assignment and tap "30 min a day".
- **Expected:** weight 3 (30 ÷ 5 ÷ 2).
- **Actual:** 3.25 (32.5 min a day). The learned suggestion was already shown as the "30" preset, so the tap counted as untouched.
- **Related:** a later 1-day assignment showed "Frank usually does about 1950 min a day." with no warning.
- **Screenshots:** `eff-02-typed-440.png`, `pace-01-note-360.png`

### F-12 — Low — Picking a preset subject creates it before the form is saved
- **Viewport:** 360
- **Steps:** new family → Timeline → + Add assignment → Subject "Math".
- **Expected:** the subject is created when the assignment is added.
- **Actual:** POST /api/subjects fires on select, so Cancel leaves an orphan subject. The same happened in the writable demo family with "Reading".
- **Screenshot:** `nf-04-first-assignment-form-360.png`

### F-13 — Low — Timeline and Assignments list show different dates
- **Viewport:** 360
- **Actual:** History spine starts Sep 9 on the Timeline but Sep 8 on the list; The Hobbit ends Nov 9 on the Timeline but Nov 13 on the list. This is probably planned dates vs stored dates, but a parent sees two different dates for the same thing.
- **Screenshots:** `par-360_timeline.png`, `par-360_schedule_assignments.png`

### F-14 — Low — The API binds to 0.0.0.0
- `apps/api/src/server.ts` hard-codes `host: "0.0.0.0"`, so a dev run listens on every network interface. I patched it locally to test.

**Severity counts:**
- **High:** 4 (F-01, F-02, F-03, F-05)
- **Medium:** 4 (F-04, F-06, F-07, F-08)
- **Low:** 6 (F-09 – F-14)

## Afterwards: what the builder's testers missed

I wrote this section only after everything above was finished. I skimmed docs/reviews/ (sprint-5/6/6b/7 verification, cm-term-run, tester-review, developer-review). My findings above are unchanged.

| My finding | Covered in docs/reviews? |
|---|---|
| F-01 Multi-row undo reverts one row | **Found** (cm-term-run #1, High). The Sprint 7 verification notes it has no ticket; S7b-01 is the follow-up. |
| F-02 Keep-end-date rewrites last week's check-in | **Missed.** |
| F-03 Minutes a day ignores days off, breaks and event skips | **Missed.** The S6-09 review (L4) raised only preset wording; S6-09 was "Meets Done when". |
| F-04 Undo toast covers the More menu / Heavier | **Missed.** Sprint 6 says the undo bar is "clear of the tab bar and edit bar"; the overlap is with the opened More menu (S6b-05). |
| F-05 Copy to a new year duplicates on re-run | **Missed.** S7-01 "Meets Done when"; no re-run test. |
| F-06 Template moves named holidays to wrong dates | **Found as an observation** (sprint-5 O2: "Labor Day Aug 23 … not Labor Day"), not raised as a finding. |
| F-07 Copy to another child duplicates a shared assignment | **Missed.** |
| F-08 Plan doesn't say what the week holds | **Found** (sprint-6b F6 observation; cm-term-run #2, High). |
| F-09 "Changed the weight of …" undo label | **Found** in cm-term-run #4. The Sprint 7 verification wrongly calls it out of date ("No such text exists in the web source now"). The text comes from the API (`apps/api/src/routes/assignments.ts:89`) and still shows on screen. |
| F-10 Zoom view order and term start | **Missed** (S7-05 order). |
| F-11 Preset minutes silently saving the suggestion | **Missed.** |
| F-12 Preset subject created before Add | **Missed** (not seen in a skim). |
| F-13 Timeline vs list dates | **Missed** (not seen in a skim). |
| F-14 API binds 0.0.0.0 | **Missed.** |

**Summary:** of my 14 findings, the builder's testers caught 3 (F-01, F-08, F-09) and noted 1 more as an observation (F-06). They missed 3 of my 4 Highs: F-02, F-03 and F-05.
