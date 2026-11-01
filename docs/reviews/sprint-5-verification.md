# Sprint 5 verification (preview, templates and the phone pass)

Tester verification of tickets S5-01 to S5-09 in `docs/tickets/sprint-5-preview-templates-phone/` at commit 6d70d6d (branch `claude/test-coverage-analysis-6dehbu`).
Date: 2026-10-31. No source or test files were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: PASS. All nine tickets meet their "Done when"; no High or Medium findings; four Low findings and four observations

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled from the gate's log (each workspace prints its own block): **879 api** (60 files), **714 web** (60 files), **102 db** (16 files), **373 engine** (26 files) in the normal run and in each of the 7 `test:tz` zones (so "373 passed" prints 8 times). The progress file says 713 web; the gate prints 714 (see L4). I did not rerun workspaces one by one.
- Setup: scratch database `hh_tester_dev` (demo seed, plus two extra copies of the demo family as non-demo logins, `ui@` for the browser and `tester@`/`other@` for API and isolation checks, plus one empty Sunday-week family inserted by SQL). API on :3000, Vite on :5173, Chromium (Playwright) at 360, 390 and 320 px. All servers are stopped (`pgrep` shows no vite or tsx) and the database is dropped. `hh_test` was touched only by the gate.
- The family's real "today" was Fri 2026-10-30 (machine clock Sat Oct 31 UTC, family zone America/Chicago). Nothing was mocked.
- Screenshots are in `docs/progress/screens/sprint-5/`. Element and viewport shots show the fixed tab bar floating mid-page; that is a capture artifact.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| L1 | Low | S5-01/02 | The preview lists assignments that already finished |
| L2 | Low | S5-05 | "Add breaks" with nothing to add does nothing and says nothing |
| L3 | Low | S5-09 | The tap-target script has the width hard-coded at 360 (no setting) |
| L4 | Low | docs | `docs/progress/sprint-5.md` still says "(this commit)" for S5-08 and S5-09, and its web count (713) is one behind the gate (714) |

### L1 (Low): the preview lists assignments that already finished

- **Reproduce:** sign in as a non-demo family with the demo data (today 2026-10-30). Events, Add event, name "Wed lessons", tick Wed, set Literature to Skip. Or via the API: `POST /api/plan/preview-event` with `{event:{name:"Tue", weekdays:[2], subjectRules:{<Literature id>:"skip"}}}`.
- **Expected:** rows for work still to do. The ticket defines `perDay` as the typical amount "from today on".
- **Actual:** "Aesop's Fables (Frank): 15 → 20 pages a day" is third of five rows. Aesop's Fables ended 2026-09-11, seven weeks before today. A draft with no start date covers past days, so finished books change. In the first API case (a Tuesday that the existing co-op already covers) Aesop's Fables was the *only* row. It also takes one of the five visible slots (`event-preview-lit-skip-360.png`).
- **Why Low:** nothing breaks and no data is touched, but a parent will wonder why a finished book is in the list.
- **Suggestion (not done):** leave out rows whose old `end` is before today.

### L2 (Low): "Add breaks" with nothing to add gives no feedback

- **Reproduce:** Days off, Use a template, 36 weeks, 2026-08-31 to 2027-05-21, Add breaks (3 added). Open the template again with the same dates: the panel says "0 breaks to add / 6 already in your days off". Tap Add breaks.
- **Expected:** a message such as "Nothing to add", or the button disabled.
- **Actual:** nothing happens (no request, panel stays open). This is the developer's documented choice ("Add does nothing while nothing to add"); it is only a polish point. The count text above the button does say 0 (`template-apply-twice-360.png`).

### L3 (Low): the tap-target script cannot run at another width

- `scripts/smoke/scenarios/tap-targets.mjs` and `flow.mjs` set the viewport to 360 px in the code; there is no `WIDTH` setting. The ticket's edge case "tap-target script on a 320 px screen" needed a scratch copy with the width changed to 320 (kept outside the repo). The result is below (clean).
- Also from the run: the script does not reach the saved-template choice, "Delete this template" or Reset in the edit bar (the developer says so). I measured all three by hand (below).

### L4 (Low, docs): progress file loose ends

- `docs/progress/sprint-5.md` shows "(this commit)" instead of hashes for S5-08 (`d033652`) and S5-09 (`6d70d6d`), and its closing count says web 713 where the gate prints 714.

## Observations (not defects)

- **O1, the edit bar's row is wider than the screen by design.** At 360 px only "Move back a week" and a clipped "Move forward a week" are in view. Start, End, Reset, End a week earlier/later and Copy are further right (the scrollbar is hidden). The ticket asks for a horizontally scrollable row, and the clipped button is a cue, but a first-time user may not find Copy. At 320 px the same. Worth watching in real use.
- **O2, saved templates shift by days, not weekday.** Saving 2026-27 (first day Mon 2026-08-31) and applying from Mon 2027-08-16 gives "Labor Day: Aug 23" (a Monday, but not Labor Day) and "Good Friday: Mar 10". This is exactly what the ticket specifies ("the same breaks shifted by the difference in start dates", weekday matching out of scope). The labels may look wrong to a parent.
- **O3, a degenerate draft can show an end before today.** A draft skipping every weekday 2026-11-02 to 2026-11-27 gives "The Hobbit (Frank): 0.8 → 1.2 chapters a day · Ends Oct 29" (today is Oct 30). That is the plan's own effective end for work that no longer fits, shown faithfully. It is not a preview bug and an unusual draft.
- **O4, S5-07 drops some days off silently.** A whole-family day off that starts before the year's first day is not saved even if it runs into the year (documented decision), and the panel's count text mentions only the per-child ones it leaves out. I did not test the 60-day cut.

## Verified, per ticket

### S5-01: event preview endpoint. Meets "Done when"

Real API, `tester@` family (demo data; stored co-op skips Literature on Tuesdays, ends 2027-04-27).

| Case | Result |
|---|---|
| New Wed event skipping Literature, no end date | 200, rows (UI shows "The Hobbit (Frank): 0.8 → 1.1 chapters a day", etc.); first API case (Tue) returns only Aesop's Fables (L1) |
| Lighter rule (Wed, 25%) | 200, several rows, each `after.perDay` higher than `before` |
| Event that changes nothing (Saturday only) | `{"changes":[],"more":0}` |
| Event for Frank only (skip Literature and Math) | every row is Frank's; Margaret absent |
| Edit, label only (body = stored values, new name, `eventId`) | empty list |
| Edit, remove Margaret from the co-op | 200, Margaret's rows only, amounts go down |
| Edit, capacity 0.5 to 0.25 | one row (Times tables 0.9 to 0.8): compared with the stored version, not on top of it |
| While the plan has check-ins (the family has two) | label-only edit is empty, so before and after use the same re-anchored plan |
| Edit with Margaret archived but still linked | 200 empty (linked archived children may stay) |
| New event naming an archived child | 400 "every id must be one of your active children." |
| `{}` | 400 `event: ... expected nonoptional` |
| Weekdays `[]` | 400 "Pick at least one day." |
| Unknown key | 400 "Unrecognized key" |
| End before start | 400 `invalid_range` |
| `eventId` malformed, or another family's | 404 "No such event." |
| Another family's child id | 400 `invalid_reference` |
| Signed out | 401 |
| Demo family | 200 (nothing written; the demo is not blocked, as decided) |
| Nothing written | event count 4 before and after all of the above |
| More than 20 changed rows | the UI showed 5 rows and "and 16 more" (21 rows: 20 returned plus `more` 1) |

### S5-02: "What changes" in the event form. Meets "Done when"

Non-demo login, real form, 360 px (and 320).

| Case | Result |
|---|---|
| Name, no day yet | no list |
| Day ticked, no rules | "What changes / No change to the plan." |
| Literature set to Skip | rows in the ticket's format; 5 rows then "and 5 more" (`event-preview-lit-skip-360.png`) |
| Default for subjects = Skip | 5 rows, "and 16 more" (`event-preview-many-360.png`) |
| Five rapid rule changes within 60 ms each | one preview request |
| Saturday only | "No change to the plan." (`event-preview-no-change-360.png`) |
| Untick every day | list disappears |
| Preview returns 500 (route-faked) | list gone, Save still posts and the event is created |
| Edit open, nothing changed | request carries `eventId`; "No change to the plan." |
| Edit: rename only | "No change to the plan." (`event-edit-label-only-360.png`) |
| Edit: untick Margaret | Margaret's rows go down (`event-edit-remove-child-360.png`); back to Whole family: "No change" |
| Edit: clear the end date | rows appear; Cancel afterwards: stored event unchanged |
| Overflow | `scrollWidth` equals the viewport at 360 and 320; the list is 286 and 246 px wide and wraps |

### S5-03: year-shape helpers. Meets "Done when"

Run from the engine source with `tsx`; `test:tz` is the gate's seven-zone run (all green).

- 2026-27 matches the ticket: Labor Day 2026-09-07, Thanksgiving 11-26/27, winter break 12-24 to 2027-01-01, MLK 2027-01-18, Presidents' Day 02-15, Good Friday 03-26, Memorial Day 05-31. Seven keys. Extra check 2027-28: Labor Day 09-06, Thanksgiving 11-25/26, MLK 2028-01-17, Presidents' Day 02-21, Good Friday 2028-04-14 (Easter April 16), Memorial Day 05-29, all correct.
- Range 2026-11-01..12-31 gives only Thanksgiving and winter break.
- 6 on / 1 off from 2026-08-17 (Mon) to 2027-05-28: breaks 09-28, 11-16, 2027-01-04, 02-22, 04-12, each 7 days, every 49 days.
- Start 2026-06-01 (Mon): first break 07-13..07-19. Start 2026-12-02 (Wed), 4 on / 1 off: week start Mon gives first break 2027-01-04; week start Sun gives 2027-01-03..01-09 (the first Sunday on or after is 12-06).
- weeksOff 0 gives `[]`; weeksOn 0, weeksOff -1 and 1.5 throw `EngineInputError`; the last break is clipped to `end`.
- `CALENDAR_SHAPES`: 36 weeks (no pattern), Sabbath 6/1, three terms 12/2.

### S5-04: bulk days off. Meets "Done when"

| Case | Result |
|---|---|
| 3 valid | 201, rows in order (B1, B2, B3) |
| Second of three has end before start | 400 "Day off 2: The end date must be on or after the start date."; 0 created |
| Second item has another family's child | 400 "Day off 2: childIds: every id must be one of your active children."; 0 created |
| 101 items | 400 "Send at most 100 days off."; 0 created |
| 100 items | 201, 100 rows |
| 0 items | 400 "Send at least one day off." |
| Unknown top-level key | 400; unknown key in an item: 400 "Day off 1: Unrecognized key"; a string item: 400 "Day off 1: ..." |
| Signed out | 401 |

### S5-05: apply a template. Meets "Done when"

Days off already had Labor Day (Sep 7), Thanksgiving break (Nov 23-27), Christmas break (Dec 21 - Jan 1) and spring break, all whole family. Preview text and the bulk body were read from the page.

| Shape and dates | Preview |
|---|---|
| 36 weeks, 2026-08-31..2027-05-21 | 3 to add (MLK Jan 18, Presidents' Feb 15, Good Friday Mar 26), "3 already in your days off"; Memorial Day is after the range |
| Sabbath, 2026-08-17..2027-05-28 | 8: breaks Sep 28-Oct 4, Nov 16-22, Jan 4-10, Feb 22-28, Apr 12-18, plus the 3 holidays; 3 already |
| Three terms, same dates | 5: Nov 9-22, Feb 15-28 (Presidents' Day dropped, inside the break), May 24-28, MLK, Good Friday; 3 already |
| Custom 4 on / 1 off, 2026-08-17..2026-12-18 | Sep 14-20, Oct 19-25; the Nov 23-29 break overlaps Thanksgiving break, so left out; 2 already |
| Custom 1 on / 1 off, 2026-08-17..2026-10-31 | Aug 24-30, Sep 21-27, Oct 5-11, Oct 19-25; Sep 7-13 left out (existing Labor Day), 1 already |
| 36 weeks, 2027-08-16..2028-06-02 (leap day inside) | 7 holidays with the right 2027-28 dates (Good Friday Apr 14) |
| Sabbath across the same leap-day year (engine) | breaks stay 49 days apart through Feb 29 2028 |
| Sunday-week family, Sabbath 2026-08-17 | breaks Oct 4-10, Nov 22-28, Jan 10-16, Feb 28-Mar 6, Apr 18-24 (Sunday to Saturday), matching the engine's `sun` output |

- Add breaks (first row): one bulk POST, `kind: "holiday"` for the three holidays, `childIds: []`; the list went from 4 to 7 rows.
- **Applied twice:** second open shows "0 breaks to add / 6 already in your days off"; Add sends nothing; the list stays at 7 (no duplicates). See L2.
- Errors (Sunday family): end before start shows "The end date must be on or after the start date." after Add; 489 days shows "That range is 489 days; the most allowed is 400."; custom weeks 0, 21, 1.5 (on or off) show "Weeks on and off are whole numbers from 1 to 20." No bulk request was sent in any of these.
- 360 and 320 px: no horizontal overflow; panel, Custom fields and checkboxes fit (`template-use-36-weeks-360.png`, `template-use-sabbath-360.png`, `template-use-sabbath-320.png`, `template-preview-leap-mon-360.png`, `template-preview-leap-sun-360.png`).

### S5-06: stored templates. Meets "Done when"

| Case | Result |
|---|---|
| Create with a holiday break and a `missed` break with label "" | 201; label "" stored as null; list returns both, same shape |
| Other family's list | `[]` |
| Other family's DELETE; malformed id | 404 "No such template." |
| Signed out (GET, POST, DELETE) | 401 |
| offsetDays 401; lengthDays 61; kind "x"; blank name; 61-char name; 0 breaks; 101 breaks; extra key; offsetDays 1.5 | each 400 with a specific message |
| DELETE own | 204; again 404; list empty |

### S5-07: save and reuse. Meets "Done when"

- Added a Frank-only sick day (Oct 12-13) to the family's whole-family days off. Save as a template, name "2026-27 year", first day 2026-08-31: the panel says "7 days off will be saved" and "1 day off for one child is left out". The POST carried 7 breaks with offsets 7, 84, 112, 140, 168, 196, 207 (Labor Day = Aug 31 + 7), kind and label kept (`template-save-panel-filled-360.png`). After saving: "Saved “2026-27 year”. Find it under Use a template." with Done (`template-saved-360.png`).
- Use a template, choose "2026-27 year", first day 2027-08-16 (350 days later): 7 breaks, each shifted by 350 days (Labor Day Aug 23, Thanksgiving break Nov 8-12, Christmas break Dec 6-17, MLK Jan 3, Presidents' Day Jan 31, spring break Feb 28-Mar 3, Good Friday Mar 10). One bulk POST; the list went from 8 to 15. A second apply: "0 breaks to add / 7 already in your days off". See O2 for how the dates read.
- Delete this template: confirm dialog "Delete 2026-27 year? / Days off already added stay as they are." with Delete 88x45 and Cancel 92x45. Cancel: no request, still chosen. Delete: one DELETE, the choice falls back to 36 weeks, the template is gone from the list and the API (`template-delete-confirm-360.png`, `-320.png`).
- Saved-template choice, "Delete this template" and the confirm: no control under 44 px at 360 or 320; no overflow.

### S5-08: compact edit bar. Meets "Done when"

Timeline, real data, five bars selected at each width (first, fourth, middle, third from last, last):

| Width | Bar height | Rows | Smallest control | Selected bar clear of the bar |
|---|---|---|---|---|
| 360 | 101 px | 2 (title row at y 592; one control row at y 636-640) | 44 px (no control under 43.5 in either size) | yes, all five: selected bar's bottom 383-574 against the bar's top at 590 |
| 390 | 101 px | 2 | all at least 44 | yes, all five |
| 320 | 101 px | 2 | all at least 44 | yes, all five |

- With a change made (Move forward a week), Reset appears (82 x 45) and the row scrolls to keep the focused button in view at all three widths; `scrollWidth` equals the viewport.
- Above 480 px: 481 px and 700 px bars are 220 px tall and 1024 px is 167 px, i.e. the layout the developer described as unchanged (it was about 220 at 700 before). See O1.
- Screenshots: `edit-bar-360.png`, `-390.png`, `-320.png`, `edit-bar-changed-*.png`, `edit-bar-700-unchanged.png`.

### S5-09: 44 px tap targets. Meets "Done when"

Run from `scripts/smoke` with `CHROME_PATH=/opt/pw-browsers/chromium`.

| Run | Result |
|---|---|
| `node flow.mjs tap-targets` (demo login) | every screen and panel "none"; ends "No undersized controls on the listed screens."; "Events > Add event: skipped" as documented |
| `TAP_EMAIL=ui@example.com TAP_PASSWORD=demo-password` | all "none", `event preview list shown: true`, "Events > Add event (draft with preview): none (35 controls)"; no undersized controls |
| 320 px (scratch copy with the width changed to 320, non-demo login) | all "none"; no undersized controls (see L3) |
| Does the script detect failures? | Raising its minimum to 50 in the scratch copy reported 17 undersized controls on This Week alone (tab links 45x51, Sign out 78x44, week steps 44x44, ...), so it is not vacuous |

Run by hand because the script cannot reach them (all clean at 360 and 320): saved-template choice, Delete this template, the delete confirm's two buttons, Reset in the edit bar (82 x 45), template and event panels.

## Edge cases from S5-10

| Edge case | Result |
|---|---|
| Preview for an event with no end date | works (Wed lessons; Tue API case); rows reflect all remaining days |
| An edit that removes a child | only the removed child's rows change, amounts go down; archived-but-linked child accepted |
| A preview while the plan has check-ins | family has two check-ins; consistent (label-only edit is empty) |
| Templates with weekStart Sunday | Sunday family: breaks run Sunday to Saturday and match the engine |
| Custom 1 on / 1 off | correct breaks; existing overlap left out and counted |
| Applying a template twice | no duplicates, nothing sent (L2 for the silent button) |
| A year spanning a leap day (2027-08-16..2028-06-02) | holidays correct; Sabbath breaks stay 49 days apart |
| Tap-target script at 320 px | clean (scratch copy; L3) |

## Judgement on the developer's decisions

Agree with: the preview reusing the create schema; not blocking the demo family for a read-only call; the rounded one-decimal comparison; one `check()` shared by preview and Save; keeping the old list while loading; whole-week pattern breaks (so "Oct 5-11", not the ticket's "Oct 5-9"); leaving the school-year dates blank; the family-wide-only overlap rule; the "Saved..." confirmation instead of closing; `display: contents` for the edit bar so the markup is unchanged; the extra panels in the tap script.

Mild disagreement:
- **S5-01 "what counts as a change" misses finished work (L1).** The decision text does not mention it, so it looks like an oversight, not a call.
- **S5-07 "start before the first day is not saved".** The rule is defensible and in the ticket's spirit, but the panel says nothing about it, so a parent can lose a summer break silently (O4).

What the developer said they could not measure, now measured: S5-08's 101 px bar and 44 px controls (confirmed at 360, 390 and 320); S5-02/05/07 layout at 360 (no overflow, wrapping text, controls at least 44 px); the native dialog (screenshots show it correctly); "Delete this template", the saved-template choice and Reset (all at least 44 px).

## What I could not verify

- A real phone: touch scrolling of the edit bar's row and the swipe discoverability (O1) were judged from layout in desktop Chromium, not on a device; iOS Safari's own date picker was not seen.
- The stale-answer ordering of the preview (an older reply never replacing a newer one) needs a slow network; it is covered only by the web tests.
- The 60-day cut of a long break when saving a template, and a template saved with more than 100 days off.
- Holidays outside 2026-2028; the Easter algorithm is covered by the engine tests only.
- A very large family (many assignments) for preview latency.
- Screen-reader behaviour of the `aria-live` list and the confirm dialog.
