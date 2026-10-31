# Sprint 4b verification (fixes from the Sprint 4 report)

Tester verification of tickets S4b-01 to S4b-07 in `docs/tickets/sprint-4b-fixes/` at commit 521f299 (branch `claude/test-coverage-analysis-6dehbu`).
Date: 2026-10-31. No product code or tests were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: PASS. All seven findings (M1 to M3, L1 to L4) are fixed; one new Low finding

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled from the gate's log (each workspace prints its own block): **839 api** (57 files; 835 at Sprint 4), **683 web** (57 files; 666), **92 db** (15 files), **360 engine** (25 files) in the normal run and in each of the 7 `test:tz` zones (so "360 passed" prints 8 times). I did not rerun the workspaces one by one.
- Setup: scratch database `hh_tester_dev` (demo seed plus my own assignments), API on :3000 and Vite on :5173, Chromium at 360 px. Both servers are stopped and the database is dropped. `hh_test` was touched only by the gate.
- Where a case needed a different date I changed the browser's view of `/api/me` (`today`, `weekStart`) with a Playwright route; those cases are marked "mocked today". The real API was used for everything else. Real "today" in the family's zone was Fri 2026-10-30 (the machine clock said Sat Oct 31 UTC).
- Screenshots are in `docs/progress/screens/sprint-4b/`. Full-page shots show the fixed tab bar floating mid-page; that is a capture artifact.

## Original findings: status

| Finding | Ticket | Status | Evidence |
|---|---|---|---|
| M1 a long assignment hides every late forecast | S4b-01 | Fixed | below |
| M2 second weekday change in a week rewrites the past | S4b-02 | Fixed | below |
| M3 no "no progress" line; "61 weeks late" | S4b-03 | Fixed (see L6 for an edge) | below |
| L1 title-only edit drops an assignment's days | S4b-04 | Fixed | below |
| L2 chips under 44 px wide at 6 and 7 days | S4b-06 | Fixed | below |
| L3 "Set as default" not undone by Cancel | S4b-05 | Fixed | below |
| L4 "Missed a day?" takes three taps | S4b-07 | Fixed | below |

## Verified, per ticket

### S4b-01 (M1): meets "Done when"

Re-ran the Sprint 4 repro. Frank has "Late book" (Sep 7 to Nov 27, 100 pages, check-ins on the weeks of Oct 12 and Oct 19 behind pace, `keepEndDate`).

| Case | Plan request the browser sent | Briefing |
|---|---|---|
| Normal family (earliest start Aug 31 2026, latest end May 21 2027) | one: `from=2026-08-31&to=2027-05-21` | "Late book will finish about 19 weeks late at this pace." |
| Add "Long saga", Sep 7 2026 to Jun 30 2028 (over 400 days) | one: `from=2026-08-31&to=2027-10-04` (start kept, far end = start + 399) | the late line stays (plus "This is a heavy week for Frank.", from the long assignment's load) |
| Shown week 2027-10-11 (past the first range) | two: `2026-08-31..2027-10-04` and `2027-10-05..2027-10-17` | late line stays |
| Shown week 2028-03-13 | two: `2026-08-31..2027-10-04` and `2027-10-05..2028-03-19` | late line stays |

The requests appear twice each in the log (the dev server's double effects), as before. No horizontal overflow (scrollWidth 360). Screenshots: `briefing-late-before-long-360.png`, `briefing-late-long-assignment-360.png`, `briefing-week-2027-10-11-360.png`, `briefing-week-2028-03-13-360.png`.

### S4b-02 (M2): meets "Done when" (real API, family week starts Mon Oct 26; assignment Oct 5 to Nov 20, started before this week)

Past days (Oct 5 to Oct 25) and the position at Oct 23 (42.86) were compared after each step.

| Sequence | Stored (`weekdays` / `weekdays_from` / `previous_weekdays`) | Past days |
|---|---|---|
| null, then `[5]` | `{5}` / 10-26 / null | unchanged |
| then `[2,4]` | `{2,4}` / 10-26 / **null** (kept) | unchanged (before the fix: re-drawn as the first change's days) |
| then back to null (the original) | all three cleared | unchanged |
| `[1..5]`, `[5]`, `[2,4]` | `{2,4}` / 10-26 / `{1,2,3,4,5}` | unchanged (the ticket's Mon-Fri, Fri, Tue/Thu) |
| then `[1..5]` | cleared | unchanged |
| a record from an earlier week (`from` 10-19) then `[4]` | `{4}` / 10-26 / the days before it (replaced, as before) | n/a |
| Subject default `[5]`, then `[2,4]`, then null | assignments: from 10-26 with previous null kept, then both cleared | unchanged |
| Subject default `[5]`, then the assignment's own `[1,3]`, then own null, then subject null | previous kept throughout; cleared at the end | unchanged |

### S4b-03 (M3): meets "Done when"

All in Chromium at 360 px, one child, check-ins on Oct 12 and Oct 19, lines shown in assignment order, three shown then "and 1 more" (an 82 x 44 px button) that expands to all four:

| Assignment | Line |
|---|---|
| Zero progress over two weeks (positions 0 and 0, `keepEndDate`) | "No progress on Stuck2 in the last 2 weeks." |
| About 19 weeks late | "Late book will finish about 19 weeks late at this pace." |
| About 1 week late | "Mild will finish about 1 week late at this pace." (unchanged wording) |
| Over 26 weeks late (positions 2 and 4 of 100) | "Slow won't finish this school year at this pace." |
| One check-in only ("OneWeek") | nothing |

No overflow. Screenshots: `briefing-m3-collapsed-360.png`, `briefing-m3-expanded-360.png`. See L6 for a pace slower than this.

### S4b-04 (L1): meets "Done when"

Math default Mon to Thu, an assignment with its own `[1,2,3,4]`. Real form, real API:

| Action | Request |
|---|---|
| Change only the title, Save | `PATCH {"title":"Own days B"}` (no `weekdays`) |
| Tick Fri, Save | `PATCH {"weekdays":[1,2,3,4,5]}` |
| Untick Fri again (back to the inherited days), Save | `PATCH {"weekdays":null}` |

### S4b-05 (L3): meets "Done when"

| Flow | Result |
|---|---|
| Add form: Math (Mon to Thu), untick Thu, "Set as default for Math" (286 x 45 px) | text becomes "Will be the default for Math." with an Undo button; **no request** |
| Then Cancel | no request; Math's default is still `[1,2,3,4]` |
| Undo | the "Set as default" button comes back |
| Tap a day chip while marked | the mark is withdrawn, the button comes back |
| Mark, then Add | `PATCH /api/subjects/<Math> {"defaultWeekdays":[1,2,3]}` (200), then `POST /api/assignments` with `"weekdays":null` (201), in that order |
| Edit of an assignment with its own `[1,2,5]`, Set as default, Save | subject `PATCH {"defaultWeekdays":[1,2,5]}`, then assignment `PATCH {"weekdays":null}`; nothing before Save |
| Edit of an assignment already at `weekdays: null`, mark, Save | the subject PATCH only (the assignment has nothing to change; the decision's rule) |
| Subject PATCH answers 500 | one request (the subject PATCH), the form shows "Couldn't save. Please try again.", no assignment request |
| Add several | has no "Set as default" button, with or without chips changed; a batch posts `"weekdays":[1,2,3,4]` as before |

Screenshots: `set-default-offer-360.png`, `set-default-marked-360.png`, `set-default-subject-error-360.png`.

### S4b-06 (L2): meets "Done when"

Measured with `getBoundingClientRect()` on every visible `.day-chip` at 360 px, demo family with school days changed through `PATCH /api/family`:

| Form | 5 days | 6 days | 7 days |
|---|---|---|---|
| Subject form | 47.6 x 46, 1 row | 47.6 x 46, 2 rows | 47.6 x 46, 2 rows |
| Assignment form | 54 x 46, 1 row | 46 x 46, 1 row | 46 x 46, 2 rows |
| Add several | 54 x 46, 1 row | 46 x 46, 1 row | 46 x 46, 2 rows |
| Events form (edit "Co-op"; same component) | 46 x 46 (7 weekday chips, 2 rows) | 46 x 46 | 46 x 46 |
| Missed-day sheet (mocked today = Sat, or Sun) | Mon to Fri: 74 to 83 wide x 46 | with Sat: same, 3 rows | with Sat and Sun: same, 3 rows |

Every chip is at least 44 x 44. `document.documentElement.scrollWidth` was 360 in every case, and the rightmost chip edge was 324.7 px or less. The subject form shows a 6-day week as five chips and one on a second line; that is what the ticket asks for. Screenshots: `subject-form-{5,6,7}day-360.png`, `assignment-form-{5,6,7}day-360.png`, `add-several-{5,6,7}day-360.png`, `events-form-{5,6,7}day-360.png`, `missed-sheet-{5,6,7}day-360.png`, `missed-7day-sun-360.png`, `missed-6day-sat-360.png`.

### S4b-07 (L4): meets "Done when"

| Case | Result |
|---|---|
| Real today, Fri Oct 30, 5-day family | Opens with Everyone and Fri 30 selected, Save enabled. Two taps ("Missed a day?", Save) post `{"label":"Missed day","kind":"missed","startDate":"2026-10-30","endDate":"2026-10-30","childIds":[]}`; the sheet closes |
| The same with the browser in UTC (Saturday there) | the same (today comes from the API, in the family's zone) |
| Mocked today = Sat Oct 31 | Fri 30 selected, Save enabled |
| Mocked today = Sun, 7-day family; Sat, 6-day family | Sun 1 and Sat 31 selected |
| Mocked today = Sun with `weekStart` sun (no offered days) | "No days to mark.", Save disabled |
| Fri already marked for Frank; reopen; Everyone | Fri 30 is still the choice; choose Frank: Fri is no longer offered and Thu 29 is selected, Save enabled; tap Tue 27, then Everyone: Tue stays |
| After the Everyone Fri save, reopen | Mon to Thu offered, Thu selected |

I deleted the missed rows I made. Screenshots: `missed-real-today-fri-360.png`, `missed-weekend-sat-5day-360.png`, `missed-no-days-sun-weekstart-360.png`, `after-two-taps-360.png`.

## Recorded developer decisions: my verdict

| Decision | Verdict |
|---|---|
| S4b-01 two ranges; the second starts at the later of (week end - 399) and the day after the first range | Agree. Verified: `2027-10-05..` after `..2027-10-04`. |
| S4b-01 only an assignment running past start + 399 can lose its forecast; the gap between the two ranges is tolerated | Agree. Not reachable with my data: forecasts stayed the same in all four cases. |
| S4b-01 replaced the S4-09 test of `briefingRange` with tests of `briefingRanges` | Agree (the thing tested changed). |
| S4b-02 "this week's" record = `weekdays_from` equals this week's start; equal-to-previous (any order, null = every school day) clears both; the same rule in SQL | Agree. See N1 for one oddity. |
| S4b-02 three test lines changed | Agree; they encoded the old behaviour. |
| S4b-03 no progress measured as `forecastFinish` measures it, in `briefingLines.ts`; no engine version change | Agree. A child who stopped after a progress week is still not flagged (the smaller point in M3); the ticket's wording allows it. |
| S4b-03 more than 26 weeks (27 or more after rounding) is the plain wording; one line per assignment in the late slot | Agree. |
| S4b-04 only a chip tap counts; "Set as default" counts as touching | Agree. |
| S4b-05 mark withdrawn by a chip tap or a subject change; Cancel discards; Undo button | Agree. |
| S4b-05 on edit, `weekdays: null` is sent only when the stored value isn't null | Agree (verified both ways above). |
| S4b-05 if the subject PATCH worked and the assignment save fails, the subject stays changed and a retry saves null | Agree. I did not force this path in the browser. |
| S4b-06 one CSS rule, `auto-fit minmax(44px, 1fr)` grid; `--day-count` removed | Agree. Measured. |
| S4b-07 "today if offered, else the latest offered day"; falls back when a tapped day stops being offered | Agree. Verified. |

I disagree with none.

## Findings

### High

None.

### Medium

None.

### Low

**L6. A very slow but non-zero pace gets no line at all.**
- Repro: an assignment of 100 pages (Sep 7 to Nov 27) with check-ins of 44.4 and 44.6 on the weeks of Oct 12 and Oct 19 (0.2 page a week), nothing else. Open This Week.
- Expected: the plain "won't finish this school year at this pace." (the ticket's goal for "a very slow pace").
- Actual: no line. `forecastFinish` looks at most 730 days past the last check-in (`MAX_PUSH_DAYS`) and then returns null, and the briefing shows nothing for null. So a pace slower than about 2 years gives silence, while zero progress gives the no-progress line and 27 to about 100 weeks gives the plain wording. It is the same shape as M3 (the slowest case is the silent one), but narrower; the ticket's wording ("more than 26 weeks late") does not cover it.
- Suggested direction: treat a null forecast with 2 or more applied weeks, some progress and work left as "won't finish this school year".

### Notes (not findings)

- **N1.** Changing an assignment from "no choice" (null) to an explicit full week (for example Mon to Fri in a Mon to Fri family) counts as a change for S4b-02: it stores `weekdays_from` with null `previous_weekdays`. Changing back to explicit Mon to Fri in the same week does not clear it (null versus the explicit list compare as different). The plan is identical either way (both mean every school day), so only the stored history differs. This is how `sameWeekdays` already treated null versus a full list; going back to null does clear it.
- The briefing lines follow assignment order, not lateness (as S4-09). A 19-week line comes before a 1-week one.
- A Playwright `click()` on a day chip label is blocked by the invisible radio/checkbox laid over it (the input intercepts the pointer); a real tap lands on the input, so this is only a test-tool detail. I used `check()` on the input.

## Could not verify

- A failed assignment save after a successful subject PATCH on "Set as default" (the decision's retry path): unit tests only.
- The forecast loss for an assignment ending in the gap between the two ranges: I found no case where it changed a line.
- Events form with "Set as default" or the timeline sheet's weekday chips (not part of this sprint's tickets).
- Real 6- and 7-day "today" for the missed-day sheet: the day chips were measured with a mocked `/api/me`; the offered days and widths come from the real component and data.
- Other browsers, real touch devices and screen readers (Chromium at 360 px only).
