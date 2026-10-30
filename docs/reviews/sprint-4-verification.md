# Sprint 4 verification (weekdays, the weekly briefing and missed days)

Tester verification of tickets S4-00, S4-01, S4-01b and S4-02 to S4-10 in `docs/tickets/sprint-4-weekdays-briefing/` at commit c98c864 (branch `claude/test-coverage-analysis-6dehbu`).
Date: 2026-10-30. No product code or tests were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: every "Done when" item holds, but three Medium findings and five Low ones

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled: **835 api** (57 files), **666 web** (57 files), **92 db** (15 files), **360 engine** (25 files) in the normal run, and again in each of the 7 `test:tz` zones (UTC, America/Chicago, America/New_York, Pacific/Auckland, Asia/Kolkata, Pacific/Kiritimati, Etc/GMT+12), so the gate prints "360 passed" 8 times. The workspaces ran in the gate's own order and the log labels them, so I did not rerun them one by one.
- Engine behaviour was checked by calling the engine directly (`npx tsx`, scripts outside the repo) and by the real API with a scratch database `hh_tester_dev` (demo seed, then my own assignments). UI was checked in real Chromium at 360 px (plus 6- and 7-day families) against the real API and Vite.
- Both servers are stopped and the database is dropped. `hh_test` was touched only by the gate itself.
- Screenshots are in `docs/progress/screens/sprint-4/` (referenced below). Full-page shots show the fixed tab bar floating mid-page; that is a capture artifact.
- Plan sums: in every scenario below I checked placed units plus `unplacedUnits` equals the total. It did, to 1e-9, in all of them.

## Per ticket

| Ticket | Verdict | Evidence |
|---|---|---|
| S4-00 missed past day carries work forward | Meets "Done when" | README repro, below |
| S4-01 plan on weekdays only | Meets | Friday-only, Tue/Thu, holiday, skip, no-Friday family, below |
| S4-01b mid-assignment change keeps progress | Meets for one change; see M2 for two changes in a week | API runs, below |
| S4-02 migration (shipped as 010, plus 011) | Meets | SQL probes, below |
| S4-03 subject endpoints | Meets | API runs |
| S4-04 assignment endpoints | Meets | API runs |
| S4-05 load into the plan | Meets | `/api/plan` shows `weekdays`, `weekdaysSource`, units only on the days |
| S4-06 subject form chips | Meets at 5 days; chips under 44 px wide at 6+ days (L2) | Chromium, 360 px |
| S4-07 assignment form chips | Meets at 5 and 6 days; under 44 px wide at 7 (L2); L1 and L3 | Chromium |
| S4-08 forecast and heavy-week helpers | Meets the ticket's test list; see M3 for how the pace reads | engine runs |
| S4-09 weekly briefing | Each line appears; M1 and M3 | Chromium |
| S4-10 Missed a day? | Meets, with L4 (3 taps, not 2) | Chromium |
| S4-11 | This report | |

### S4-00: the README reproduction (re-run by me)

100 pages, 2026-10-05 to 2026-11-27, Mon to Fri, weekStart mon, asOf 2026-10-29, Oct 28 missed:

| Measure | Expected | Actual |
|---|---|---|
| Position at end of Oct 27 | 42.5 | **42.5** |
| Oct 28 units | 0 | **0** |
| Oct 29 and Nov 27 units | 57.5 / 22 = 2.6136 | **2.6136** on both |
| Sum of units | 100 | **100.000000** |
| Same day as a `sick` day (old behaviour) | 43.59 | 43.59, unchanged |

More engine scenarios, all conserved and all with the days before the missed day identical to the plan without it:
- A shared assignment, Frank missed Wed Oct 28: Frank 42.5 / 0 on Oct 28; Margaret 42.5 / 2.5 on Oct 28 (unchanged). The same through the real API (`/api/plan`): Frank 3.57 to 0.00 on the day and 3.83 on Oct 29, Margaret 3.57 and 3.57.
- The same day marked missed twice (two rows, through the API; the UI does not offer a day twice), and also an overlapping Frank row plus an Everyone row: identical plan to once.
- Missed on a day with an event (Wed "lighter", and a "skip" event): 42.5 before, 0 on the day, conserved. Through the API, Margaret's Thursday (Violin) marked for Everyone: fine.
- Four missed days Mon to Thu including today: position at end of Oct 23 is 37.5, remaining spread from Oct 30.
- A missed Friday on a Friday-only assignment: position before it 25, Friday itself 0, the remaining 75 over the next 5 Fridays (15 each). A missed Thursday on the same assignment changes nothing.
- A check-in in the same week wins (tested in the repo; my run: missed Wed plus a Oct 26 check-in at 50, sum 100).
- Last day marked missed (asOf the last day): 2.5 units left with nowhere to go, `unplacedUnits` 2.5, `no-capacity`. See note N1.
- Time zones: my scenario scripts print byte-identical output under UTC, Pacific/Kiritimati, Etc/GMT+12 and Pacific/Auckland.
- Real API: `POST /api/blocked-ranges` with `kind: "missed"` returns 201 and round-trips; `kind: "bogus"` is 400. In the database: `bogus` is rejected by `blocked_range_kind_check`, `missed` accepted.

### S4-01: weekdays in the engine

| Case | Result |
|---|---|
| Friday only, 12 lessons over 12 weeks | 1 per Friday, 0 units and 0 thickness on other days |
| Friday only with a Friday holiday (Oct 9) | Oct 9 is 0, the lesson spreads: 12/11 = 1.09 on the other Fridays |
| Friday only, a skip event on one Friday | same as the holiday |
| Friday only, a skip event on every Friday | `no-capacity`, 12 unplaced (nothing placed anywhere) |
| Family school days Mon to Thu, Friday-only assignment | `no-capacity`, 12 unplaced, in the engine and through `/api/plan` and the briefing |
| Weekdays `[0,6]` in a Mon to Fri family | `no-capacity` |
| Invalid `[7]`, duplicate `[5,5,1]` | `[7]` is no choice (every school day); `[5,5,1]` is read as Mon and Fri |
| Through the API: Friday-only 12 units, holiday on Dec 4 | 2.00 per Friday becomes 2.40 on the remaining five |
| Tue/Thu assignment, two behind check-ins | nothing placed off Tue/Thu after the check-ins |
| Tue/Thu, check-ins ahead (30 then 60) | forecast null, no early finish flag |
| Tue/Thu, behind with `pushEndDate` | end moves to 2026-12-10, still only Tue/Thu |
| Friday only, check-in at 100 | finishes early, end Oct 2, only on Fridays |
| Friday only, behind, push, all later Fridays blocked | 90 units unplaced, `no-capacity` (nothing invented) |
| `weekdaysSource` | `subject` after a subject default, `assignment` for own days, `default` otherwise |

### S4-01b: changing days mid-assignment (real API)

Setup: Math, Frank, Oct 5 to Nov 27 (started before this week, which starts Mon Oct 26; today is Fri Oct 30).

| Step | Result |
|---|---|
| Subject default changed to `[5]` (Fridays) | The uncustomised started assignments got `weekdays_from = 2026-10-26`, `previous_weekdays = NULL` (Math 3, Math 5, Times tables, my assignment A). Days before Oct 26 are identical to before, position at Oct 25 unchanged (42.857), the rest on Fridays only (14.29 on Oct 30, Nov 6, 13, 20); sum 100 |
| The customised Math assignment (weekdays `[1,2,3]`) | Plan unchanged, byte for byte |
| An assignment starting this week, days changed | No `weekdays_from` stored (row is NULL); plan as S4-01 |
| An assignment starting in a later week, days changed | No `weekdays_from` stored |
| Engine: switch Mon to Fri to Fridays from Oct 26, and back | Past days identical, position at Oct 25 37.5 both ways, conserved |

Directly changing an assignment's days likewise sets `weekdays_from`/`previous_weekdays` in the same update. Two changes in the same week: see **M2**.

### S4-02: migration

`010_weekdays.sql` (the ticket's "009" was taken by S4-00, which is right) and `011_weekdays_from.sql`. Applied to a database with data: existing rows read NULL. I tried `{7}`, `{-1}`, `{}`, `{1,NULL}`, `{1,1}` on `subject.default_weekdays`: all rejected by `subject_default_weekdays_valid`; `{1,2}` and NULL accepted. `previous_weekdays` without `weekdays_from` is rejected by `assignment_previous_weekdays_need_date`.

### S4-03 / S4-04: endpoints

`defaultWeekdays` and `weekdays` round-trip sorted. Bad values, each a 400 with a clear message on both the subject PATCH and the assignment PATCH: `[]` ("Pick at least one day."), `[7]`, `[-1]` ("Weekdays are 0 (Sunday) to 6 (Saturday)."), `[1,1]` ("Days can't repeat."), `[null]`, `"x"`, `[1.5]`. A bulk create with a bad third item: "Assignment 3: weekdays.0: Weekdays are 0 (Sunday) to 6 (Saturday)." (the item is named). Single create with `weekdays: [1,2,3]` and with none (null) both work; patch sets and clears.

### S4-05: the plan

`/api/plan` carries `weekdays` and `weekdaysSource`; units appear only on the assignment's days. A subject default change makes an uncustomised assignment follow it (`weekdaysSource: "subject"`) and leaves a customised one alone (S4-01b table).

### S4-06 and S4-07: forms (Chromium, 360 px)

- Subject form: chips are 47.6 x 46 px, five across, no horizontal overflow (`subject-form-5day-360.png`). The last selected chip cannot be deselected (tapped all but one; the count stayed at 1). Mon to Thu saves `PATCH {"defaultWeekdays":[1,2,3,4]}`; the list shows "Mon–Thu" next to Math (`subjects-list-mon-thu-5day-360.png`); a subject without a default shows nothing.
- Assignment form: chips 54 x 46 px. With no subject all five are selected. Choosing Math (default Mon to Thu) re-prefills to Mon to Thu with no "Set as default" button. Tapping Tue and Thu off gives Mon and Wed and shows "Set as default for Math" (286 x 45 px). After a tap, changing the subject keeps the chips. A new Math assignment with the inherited days posts `"weekdays":null`.
- Add several: the same chips, 54 x 46 px, one shared row (`add-several-5day-360.png`). I did not post an Add several batch in the browser.
- Not run in the browser: copying a Mon/Wed assignment, CSV import posting null, the timeline sheet. The repo's web tests cover them.

### S4-08: helpers

Engine runs: on pace gives no forecast (on-plan check-ins are not stored, so nothing is applied); one check-in gives null (also in the browser, below); behind over 2 weeks gives a later date (2027-04-27 for the Tue/Thu case); ahead gives null; zero progress over 2 weeks (check-ins at the week's start) gives null with no crash; a week at 1.64 times the average gives `ratio` 1.64, a quieter week 0.91, and no plans gives `{0, 0, 0}`. See M3 for how the pace reads.

### S4-09: the briefing (Chromium, 360 px)

| Case | Result |
|---|---|
| No assignments / one clean assignment, family never checked in | no briefing region at all, and no nudge |
| Same, one check-in only (behind) | only "Last week isn't checked in yet." (a link; no late line) |
| Two check-ins, behind | "Late book will finish about 61 weeks late at this pace." (`briefing-late-360.png`) |
| Saturday-only assignment in a Mon to Fri family | "Saturday only has no school days left." |
| Friday assignment whose last Friday is marked missed | "Friday book has no school days left." |
| A 600-page assignment this week | "This is a heavy week for Frank." |
| More than three lines | first three, then "and 2 more" as a 44 px button; it expands to all five (`briefing-collapsed-360.png`, `briefing-expanded-360.png`) |
| Nudge link | 232 x 44 px; clicking sets `#last-week-checkin`, and the card with that id exists |
| Clean plan (all assignments removed) | no briefing region |

No horizontal overflow at 360 px (scrollWidth 360) in any state. The briefing's own plan request, as the browser sent it: `/api/plan?from=2026-09-07&to=2026-11-27`.

### S4-10: Missed a day?

- Header at 360 px: "Missed a day?" is 148 x 45 px, below the title and week switcher (the header is 97 px tall); the week arrows are 44 x 44 (`this-week-360.png`).
- Sheet: Who chips (Everyone 95.6 x 46, Frank 74, Margaret 93.2) and Day chips (Mon 26 to Fri 30, 74 to 83 wide, all 46 high); Save and Cancel 76 and 92 x 45. No overflow (`missed-sheet-360.png`, `missed-sheet-picked-360.png`).
- Only school days up to today are offered (Mon 26 to Fri 30; today is Fri Oct 30). Marking Tue 27 for Margaret posts `{"label":"Missed day","kind":"missed","startDate":"2026-10-27","endDate":"2026-10-27","childIds":["<margaret>"]}`; the sheet closes; the plan table refreshes without a reload (Frank's Wed marked: Wed 156.5 to 0, Thu 156.5 to 232, Fri 166.5 to 242; `this-week-after-missed-360.png`).
- A day already off is not offered: after Margaret's Tue is marked, Margaret no longer sees Tue; Everyone still sees it (only one child is off); Frank still sees it. After Frank's Friday was marked, Frank no longer sees Fri 30 and Everyone still does. Correct per the decision.
- The plan result matched S4-00: Margaret's position before the day unchanged, other child unchanged (API numbers in the S4-00 section).
- Days off page lists "Missed day" rows (`days-off-with-missed-360.png`); editing a missed row offers "Missed day" as a kind. The demo family could create, but not add events (`demo_read_only`), as the days-off endpoints and event endpoints have different demo rules; the ticket only says days-off rules apply, so this is as designed.

### Demo login

`demo@example.com` / `demo-password` signs in (API 200, `/api/me` returns `demo: true`) and the This Week page renders.

## Developer decisions: my verdict

| Decision | Verdict |
|---|---|
| S4-00 migration number 009; S4-02 as 010; S4-01b as 011 | Agree. |
| S4-00 "past" means on or before asOf (today counts); a missed day after asOf or with no asOf is an ordinary day off | Agree. I marked today missed and it behaves like a past day. |
| S4-00 a range of several days: each is a missed day, in date order | Agree. |
| S4-00 no work on that day means no replan | Agree. Verified (Thursday on a Friday-only assignment). |
| S4-00 missed on the last capacity day gives `unplacedUnits` and `no-capacity`, no invented end date | Agree (see N1). |
| S4-00 check-ins win for a missed day on or before their week | Agree. |
| S4-01 invalid list = no choice; a day outside the list is capacity 0 but `schoolDay` stays | Agree. |
| S4-01b the plan is built as if nothing changed, then re-anchored | Agree. |
| S4-01b "started" = start before the first day of the current week | Agree. |
| S4-01b only one level of history, a later change overwrites both | **Disagree with the outcome**, though it follows the ticket text (M2). |
| S4-04 PATCH touching weekdays or subject records history; moving an uncustomised assignment to a subject with a different default counts | Agree. |
| S4-07 chips equal to the inherited days save null, so editing such an assignment makes it follow the subject | **Disagree for plain edits** (L1). |
| S4-07 "Set as default" patches the subject at once, and stays if the form is cancelled | **Partly disagree** (L3). The button's wording says it acts now, but Cancel then leaves a changed default that also reshapes other assignments, with no message. A short confirmation or doing it at Save would be safer. |
| S4-08 observed pace measured over the whole span of check-in weeks; planned pace is total over capacity to planned end; null after 730 days | Agree with the choice, but see M3. |
| S4-08 no version bump | Agree. |
| S4-09 own plan request, capped at 400 days, keeping the shown week | **Disagree** (M1). The cap loses the start of the range, not the far end as the decision says. |
| S4-09 check-ins rebuilt from `checkInWeeks` | Agree; it works and only the week count matters. |
| S4-09 one nudge per family, not per child; "checked in" excludes a family that only skipped | Agree. |
| S4-09 one line per assignment (problem lines hide the late line) | Agree. |
| S4-10 nothing preselected; "Missed a day?" is open, pick a day, Save | **Disagree mildly** (L4). The ticket says two taps; preselecting today would give two for the common case. |
| S4-10 "already off" includes missed rows; events never hide a day | Agree. |
| S4-10 a family with one active child is not asked who | Agree. |

## Findings

### High

None.

### Medium

**M1. One assignment longer than about 400 days hides every late forecast on This Week.**
- Repro: a family with two check-ins on a Sep 7 to Nov 27 assignment (so "will finish about N weeks late" shows). Add any assignment from 2026-09-07 to 2028-06-30. Open This Week.
- Expected: the late line stays (at most the long assignment's own forecast is imprecise, as the decision says).
- Actual: the late line for the short assignment disappears. The briefing then asks for `/api/plan?from=2026-10-26&to=2027-11-29`; the range is cut from the start (it begins at the shown week), so the plan has no days for the check-in weeks and `forecastFinish` returns null. I confirmed it by running the engine on both windows: with `from=2026-09-07` the forecast is 2028-01-31; with `from=2026-10-26` it is null. In my run a "heavy week" line appeared in its place, because the weekly average also changed with the window.
- Also, the forecast date depends on the window when it is cut at the end (a 116-day window gave 2028-02-29, a 400-day window 2028-03-30 for the same assignment).
- Screenshots: `briefing-late-ok-360.png` (before) and `briefing-late-lost-360.png` (after).
- Suggested direction: keep the earliest start and cut the far end (or ask for the range in two requests).

**M2. A second weekday change in the same week rewrites the past days.**
- Repro: History assignment, Oct 5 to Nov 20, started before this week (week starts Oct 26). `PATCH weekdays [1,3]`, then `PATCH weekdays [2,4]`.
- Expected (ticket goal): past days keep their placement.
- Actual: after the first change the past is intact. After the second, `previous_weekdays` is `{1,3}` (the first change's new days), so the days before Oct 26 are re-drawn as a Mon/Wed week: for example Oct 5 goes from 3.6 to 7.1 units and Oct 8 from 3.6 to 0. The position at the end of Oct 25 is unchanged (42.86), so totals and the future are right; only the day-by-day past changes. The same happens with a subject default change followed by an assignment change in the same week (my assignment A).
- This is the ticket's "a later change overwrites both" taken literally. A mistaken tap fixed a minute later is the usual way to hit it. Keeping the existing `previous_weekdays` when `weekdays_from` already equals this week's start would avoid it.

**M3. The briefing says nothing about a child who has made no progress, and the pace reading is odd at the edges.**
- Repro: an assignment with check-ins at the week's starting position for two weeks (position 16.28 and 16.28; zero progress). Open This Week.
- Expected: some flag. S4-08 says null is "reported as 'no recent progress' by the caller".
- Actual: only the nudge. S4-09 lists no "no recent progress" line and none was built, so the most-behind case is silent, while a child who made a small amount of progress gets "about 61 weeks late". (`briefing-zero-progress-360.png`)
- Related, smaller: the pace runs from the start of the first check-in week, so two check-ins that are equal (5 then 5) still give a forecast (March 2028 in my run) because the first week had progress, and the zero-progress rule only applies when both weeks are flat. Not wrong under the developer's decision, but "no recent progress" is not detected for a child who stopped after the first week.

### Low

**L1. Editing an assignment's title alone can drop its own days.**
- Repro: Math default Mon to Thu; an assignment with explicit `weekdays [1,2,3,4]`. Open it, change only the title, Save.
- Expected: `weekdays` untouched.
- Actual: `PATCH {"title":"...","weekdays":null}`. The assignment now follows the subject, so a later subject default change moves it. If the days do not differ from the default, nothing visible changes today, only later. Follows the ticket's step 3 literally.

**L2. Day chips are under 44 px wide for 6 and 7 day school weeks at 360 px.**
- Heights are 46 px everywhere. Widths: assignment form and Add several 54 (5 days), 44.3 (6 days), 37.4 (7 days); subject form 47.6 (5 days), 39 (6 days), 32.8 (7 days; it sits inside a bordered fieldset). The ticket says "chips are 44 px targets at 360 px". Default families use five days, so this is Low. Events have the same issue with seven chips (pre-existing).
- Screenshots: `subject-form-6day-360.png`, `subject-form-7day-360.png`, `assignment-form-7day-360.png`, `add-several-7day-360.png`.

**L3. "Set as default for {subject}" is not undone by Cancel.** See the decisions table. Verified in the browser: after Set as default (Mon, Wed) then Cancel, the subject's default stayed `[1,3]` and the button disappeared with no message. With S4-01b this also gives every uncustomised started assignment of that subject a `weekdays_from`.

**L4. "Missed a day?" takes open, pick a day, Save (three taps), not two.** The ticket says "in two taps"; the decision names this. Everyone is preselected; the day is not.

**L5. Marking today missed on the last day of an assignment shows "has no school days left".** Correct per the rule (the work has nowhere to go) and clear, but surprising on a Friday. Informational; see N1.

### Notes (not findings)

- **N1.** A missed last day gives `unplacedUnits` and the briefing line "has no school days left." That matches the decision; the line does not say the end date needs moving (week adjust, C1, is out of scope).
- The weekly table on This Week scrolls sideways inside its own box at 360 px (the cut-off sixth column in the screenshots); pre-existing and not part of this sprint. The page itself has no horizontal scroll.
- The ticket's "9" migration numbering is explained in the progress notes. The database README lists 009 to 011.
- Engine version on `/api/health` is 0.9.0 as the progress notes say.

## Could not verify

- Event "skip" and "lighter" through the real API for a weekday assignment: the demo family may not add events (`demo_read_only`), so I used the seeded events and the engine directly. A Friday skip event, a Tuesday skip and a lighter event were all tested in the engine.
- Add several posting a batch with shared days, copy from the Assignments screen and the timeline, and CSV import posting null: web tests only, not in the browser.
- The timeline sheet's weekday chips and `applySubject` after "Set as default" on the timeline.
- A second signed-in family (non-demo) and its write rules: not created; every API and browser run used the demo family.
- Other browsers and screen readers; Chromium at 360, and the 6- and 7-day measurements, only.
- The unchecked-last-week nudge when the family only ever skipped weeks: not run in the browser (code and decision only).
