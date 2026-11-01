# Sprint 8 verification (Soft Paper: the new look, Home and navigation, light and dark)

Tester verification of S8-01 to S8-09 and S8-11 in `docs/tickets/sprint-8-soft-paper/`, branch `claude/test-coverage-analysis-6dehbu`, commits 26f3c28..4d2973c. This is S8-10. Date: 2026-11-01. No source or test files were changed; the only files added are this report and the screenshots in `docs/reviews/sprint-8/`.

> **Independence note:** This pass was run by a separate tester agent briefed by the coordinating session that wrote the tickets and directed the build. It is not an independent review by a different person.

## Verdict: NOT READY for Will yet. 1 ticket fails, 3 are partial, 6 meet "Done when"; the gate is ALL GREEN

The look itself is good. Home, Track work, the check-in sheet, the setup lists and both themes read as the mockup: cream and charcoal pages, fern accent, Fraunces and Nunito Sans, pastel bars with icons, nothing scrolling sideways at 320, 360, 390 or 1280 px, text contrast passing on every screen in both themes. A brand-new family can go from sign-in to a planned week by following Home's checklist. Three defects block a sign-off, because they put a wrong or unreadable thing in front of a parent:

- **N1 (High):** Schedule's Week bars show page and lesson ranges counted from zero ("lessons 1-5" for work that is really lessons 31-36; "pages 1-48" for a book already past page 110). Track work shows the right range for the same assignment.
- **N2 (High):** tapping a Year lane badge shows the subject name in a popover that is 20 px wide, so only "Li" or "Sc" is visible.
- **N3 (High):** at 640 px and wider, the Year edit bar (Start, End, Copy, More, so "Update time estimate") sits behind the tab bar and cannot be clicked.

Numbers:
- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate). Counts from the gate's log: **1007 api** (68 files), **1001 web** (78 files), **123 db** (19 files), **420 engine** (29 files), and 420 engine in each of the 7 `test:tz` zones.
- Tickets (S8-01 to S8-09, S8-11): **6 meet** (S8-02, 03, 04, 06, 09, 11), **3 partial** (S8-01, S8-07, S8-08), **1 fails** (S8-05).
- 14 new findings (N1 to N14 below): 3 High, 3 Medium, 8 Low.
- Tap-target script at 360 px, light and dark, and at 320: only the 11 known Year badges are undersized, in all three runs; "Events > Add event" measured with a non-demo family and clean.

## Setup

- Scratch database `hh_s8_dev` (Postgres 16, role hh), API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173 only; no tunnels, nothing exposed, nobody contacted. Chromium through Playwright (and the repo's Puppeteer smoke scripts). The database is dropped and the servers stopped at the end.
- Families, made with the repo's `seed()` and the app's own screens: `p@example.com` (a writable copy of the demo family: Frank and Margaret, 20 assignments, co-op, breaks; used for most checks; I added "Late Reader", Woodworking and a few check-ins), `q@example.com` (a second copy, for "Yes, all done" and Appearance), `e@example.com` (an empty family, for the brand-new-family run). The demo login itself was used only by the smoke scenarios.
- "Today" was the real Saturday 31 October 2026 (Chicago time), so "this week" is 26 Oct - 1 Nov and "last week" 19-25 Oct.
- Screenshots: 12 key ones are in `docs/reviews/sprint-8/` (named in the text). The full set (320, 360, 390 and 1280 px, light and dark, 11 screens each, 88 shots, plus sheets and flows) is in `/tmp/claude-0/-home-user-Homeschool-Hub/7a240ed6-3fb3-5430-b251-2b10ddef71fc/scratchpad/s8/shots/`, named `<screen>-<width>-<light|dark>.png`. The developer's "before" shots are in `docs/progress/screens/sprint-8/before-*.png`.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| N1 | High | S8-05 | Week bars show ranges counted from zero for any assignment already under way ("lessons 1-5" for lessons 31-36) |
| N2 | High | S8-07 | The Year badge popover is 20 px wide at every width, so the subject name is cut to two letters |
| N3 | High | S8-07 | At 640 px and wider the Year edit bar is behind the tab bar; Start, End, Copy and More cannot be clicked |
| N4 | Medium | S8-01 | A subject has two colours: Set up shows its stored swatch (Literature lilac, Art green), bars and lanes show a slot colour (Literature honey, Art coral) |
| N5 | Medium | S8-08 / S8-11 | A subject row with a "usual effort" pill loses its name: "M..." at 360 px, blank at 320 px |
| N6 | Medium | S8-04 | 20 of 26 browser smoke scenarios no longer run on the new screens (stale selectors); only `tap-targets` was updated |
| N7 | Low | S8-05 | axe: serious "label-content-name-mismatch" on the Week bars |
| N8 | Low | S8-07 | Small Year badges (20 to 23 px tall) miss about one finger-sized tap in three; they never hit the wrong lane |
| N9 | Low | S8-04 | Home's Track work card says "All done" beside a child who has nothing planned |
| N10 | Low | S8-06 | After "Not quite" nothing says what to do: the question goes and every bar shows a tick |
| N11 | Low | S8-08 | Setup forms keep native bits: blue radios in dark, clipped date and select text at 360 px, a default "Usual days" border |
| N12 | Low | S8-04 | `/timeline?view=...` loses "Year"; the old `/schedule` hub link lands on the Schedule |
| N13 | Low | S8-05 | The "heavy week" line is a bare name line plus a sentence, unlike the other cards |
| N14 | Low | S8-07 | Year keeps its own All / Frank / Margaret chips instead of the shared Frank / Margaret / Both control |

### N1 (High): Week bars count from zero
- **Reproduce:** sign in as a copy of the demo family. Schedule, Week (This week). Frank's bars read "The Hobbit chapters 1-4", "Math 5 lessons 1-5", "History spine lessons 1-5", "Science 5 lessons 1-4"; Margaret's "The Secret Garden chapters 1-4", "A Child's Garden of Verses pages 1-20". Now open Track work: last week's bars for the same work read The Hobbit chapters 10-13, Math 5 lessons 31-35, History spine lessons 25-30, The Secret Garden chapters 12-15. Step to Coming week: still "lessons 1-5". With an extra book, "Late Reader" (300 pages, Sep 7 to Nov 27, behind), the bar reads "pages 1-48" and after Move end "pages 1-2". (`week-360-light.png`, `week-320-dark.png`)
- **Actual:** the range always starts at the first unit of the book. Cause (read, not changed): `barsFromPlans` in `features/week/weekBars.ts` calls the engine's `plannedRangeForWeek`, which adds up the units of the plan days *before* the week to find where the week starts. The Week view asks `/api/plan` for only that week, so there are no earlier days and "from" is 0. A new family's first week (where 0 is right) hides it, and so do the unit tests.
- **Expected:** the same range Track work shows (S8-05 step 3; DESIGN_DIRECTION point 7, the picture must not mislead). The adjustment sheet ("4 lessons") will also disagree with the bar until this is fixed.
- **Suggest:** request the plan from the start of the year (as the timeline does) or use each day's cumulative `position`; add a test with an assignment already under way.

### N2 (High): the badge popover shows two letters
- **Reproduce:** Schedule, Year. Tap the Literature badge (or any other). The popover (`.tl-lane-pop`, role status) measures 20 x 27 px at 360, 390 and 1280 px, with the text 121 px wide inside it ("Literature · Frank"); it shows "Li". Science (Margaret): "Sc". (`n1-badge-popover-clipped.png`, which is N2 here; the file name predates the numbering.) The status text is right for a screen reader and the lane does dim, so half of the feature works.
- **Expected:** S8-07 step 4, "tapping a badge shows the subject's name in a small popover". Probably the popover shrinks to fit the 24 px gutter and needs `white-space: nowrap` or a width.
- Both themes.

### N3 (High): the edit bar is behind the tab bar from 640 px up
- **Reproduce:** Schedule, Year at 768, 1024 or 1280 px wide. Click a bar (for example Robinson Crusoe). Only the edit bar's title shows: at 1280 x 800 the bar spans y 666-800 and the tab bar y 731-800, so Start, End, Copy and More (y 743-788) are under the tab bar. `elementFromPoint` on More returns the Track work link, and a mouse click on More is intercepted. At 600 px and below the bar sits above the tab bar and works. (`n2-edit-bar-behind-tabs-1280.png`)
- **Cause (read):** `timeline.css` has `@media (min-width: 640px) { .tl-edit { bottom: 0 } }`, left from when the wide-screen nav was at the top; the S8-04 tab bar is at the bottom at every width.
- **Impact:** on a laptop or tablet a parent can select a bar but cannot reach Update time estimate, Copy or the dates with a mouse. Phones are fine.

### N4 (Medium): one subject, two colours
- **Reproduce:** Set up, Subjects: Literature has a purple dot and a lilac badge; Art a green dot and a honey badge. Schedule, Week and Year: Literature bars are honey, Art coral. In the new family I made, Math is honey on the bars. (`n3-subject-name-lost-360.png` beside `week-360-light.png`.)
- **Why:** documented by the developer: the timeline deals its slots by display order, while Set up and the subject select use the stored swatch. S8-01 step 3 says current subjects keep their identity.
- **Suggest:** colour bars and lanes by the stored swatch (the mapping already exists), or colour Set up by slot.

### N5 (Medium): a subject loses its name next to a long pill
- **Reproduce:** Set up, Subjects at 360 px: Math (which has a usual effort) reads "M..." then the pill "about 40 min a lesson"; at 320 px the name is gone and the row shows only the pill. (`n3-subject-name-lost-360.png`.) The name column collapses before the pill does.
- **Expected:** the name wins; the pill can wrap below it.

### N6 (Medium): the smoke scenarios
S8-04's note says only `tap-targets.mjs` was updated. I ran every other scenario in `scripts/smoke/scenarios` once, in one batch, against the new build (demo login): **6 exit 0** (`edge`, `kids-add`, `kids-edit`, `login`, `s2a-17`, `subjects-add`) and **20 fail**: `auth`, `axe`, `axe-2a`, `engine-version`, `full-flow`, `kids-list`, `peek`, `plan-debug`, `s2a-12-hub`, `s2a-13-settings`, `s2a-14-assignments`, `s2a-15-days-off`, `s2a-16-events`, `s2a-hardening`, `s2b-screens`, `subjects-edit`, `subjects-list`, `tester-odd`, `tester-probe`, `tester2-odd`. Where the cause is printed it is a selector or text from the old screens: the Plan `table` and `table.plan-d...`, `.shell-footer span` (the engine version footer, now empty), `.schedule-hu...` (the old hub), `.schedule-actions .btn`. Others time out waiting for old headings. The old links themselves are fine (`kids-add` and `kids-edit` pass through the `/kids` redirect). These are stale scripts, not product bugs, but I did not diagnose each timeout, and a batch run on one family can let one scenario affect the next. They need updating or retiring (a ticket), and nothing but `tap-targets` and `axe-2a` (which found N7) exercises the new Home, Track work, Week bars, Update status or badges in a real browser.

### N7 (Low): Week bars fail an axe rule
`axe-2a` reports one serious violation on Schedule, Week: `label-content-name-mismatch` on the bars (`button[aria-label="The Hobbit, chapters 1-4"]` and the others). A voice-control user saying the visible words may not match the name (WCAG 2.5.3). Make the accessible name start with the visible text.

### N8 (Low): how the 24 px badges feel to tap
See "Tap targets" below.

### N9 (Low): "All done" with nothing planned
A new family with children and no assignments sees "Frank  All done" and "Margaret  All done" on Home's Track work card, full bars. It should say "Nothing planned" (or hide the row) until work exists.

### N10 (Low): "Not quite" has no instruction
Track work, "Not quite": the question card goes and Frank's bars appear all ticked, with only "Save check-in" below (`track-check-in-360.png`). A parent has to guess that unticking means "didn't get to it" and tapping a bar means "something in between". One line would do ("Untick what didn't get done. Tap a bar if it was partly done.").

### N11 (Low): native leftovers on setup forms
Dark mode on the setup screens is otherwise good and readable. Leftovers: the radios (Appearance, "Week starts on", "Who it's for") use the browser's accent, blue in dark; date fields at 360 px clip to "mm/dd/yyy" and the event form's selects to "Use default (Normal"; Subject's "Usual days" fieldset keeps a default square border; the Subject form says "Usual effort" (in minutes, so not an engine number, but the word is the engine's). The developer deferred the date popover, steppers and "More" grouping on purpose; Will should say if they come back as a ticket.

### N12 (Low): old links
Old routes redirect and keep their query (below), with two edge cases: `/timeline?view=x` becomes `/schedule?view=x`, because the old query overrides the `view=year` the redirect adds; and the old `/schedule` (the Set up hub) now opens the Schedule page. By design, but an old bookmark of the hub lands somewhere else.

### N13 (Low): the "heavy week" line
On Schedule, Week (coming week of the new family), the briefing sentence appears as a bare child name and then "This is a heavy week for Frank." in plain text (`nf-7-week-next.png` in the scratchpad). The late line on the same screen is a card with buttons; this one looks unfinished and says the name twice.

### N14 (Low): Year's child chips
Year keeps the older "All / Frank / Margaret" chips with their own selection, not the Frank | Margaret | Both control used on Week and Track work (the developer notes the zoom row and chips were not restyled). Will's "one child at a time, plus Both" holds on Week and Track work, and the choice on those two is remembered and shared.

## What Will should look at first

1. **Schedule, Week, on a phone.** Compare "Math 5 lessons 1-5" with Track work's "Math 5 lessons 31-35" (N1). This is the one that would confuse a parent.
2. **Schedule, Year: tap a badge** (N2), then on a laptop select a bar and try Copy or More (N3).
3. **How a subject's colour changes** between Set up and the bars (N4) and the missing name on Math (N5).
4. **The look itself,** which is good: Home (`home-360-light.png`, `home-360-dark.png`), Track work (`track-check-in-360.png`, `update-status-360.png`), Year (`year-360-light.png`, `year-360-dark.png`), a new family (`new-family-home-360.png`).
5. **Badge size.** My view is below: keep the 24 px gutter but grow each badge's tap area to at least 32 px tall; do not widen the gutter.

## Verified, per ticket

### Gate: ALL GREEN
Run once with `CHECK_LOG` set as asked; it ended "ALL GREEN". Counts are in the verdict.

### S8-01 tokens, fonts and colours: Partial (N4)
- **Meets:** cream `#FAF6EE` and charcoal `#1C1A17` pages (read from the computed `html` background in both themes: rgb(250,246,238) and rgb(28,26,23)); Fraunces on titles and Nunito Sans on text (`h1` computes to "Fraunces Variable", body to "Nunito Sans Variable"); the eight pastels with strong rules; 14 px cards and pill buttons.
- **Fonts offline:** self-hosted. With every request to any host other than 127.0.0.1 aborted, four routes loaded, `document.fonts` reported both families loaded and `check()` true; zero requests left the machine; the production build has eight `.woff2` files in `dist/assets` (256 KB in all) and no Google Fonts or other external URL. The service worker is a placeholder with no offline cache, so there is no offline mode as such (that is the PWA's stated v1 scope); "fonts load offline" holds in the sense that nothing is fetched from the internet.
- **Contrast:** my own check of every text node on all 11 screens at 360 px, each colour against its real background (nested alpha mixed, opacity applied): **no text under 4.5:1** (3:1 for large). Lowest ratios: 4.86 in light (a muted line on a pastel), 5.98 in dark, on Track work, Schedule and Subjects; 4.86 and 5.98 appear on every screen with bars. The gate's `css-contrast` tests cover the token pairs, strong-on-fill 3:1 and the check rings.
- **Fails:** step 3, "current subjects keep their identity": N4.

### S8-02 light, dark and system: Meets
- With the device in dark, every screen is dark (11 screens at 4 widths, 88 shots, each pair compared by eye and by `data-theme`).
- Family settings, Appearance: Dark sets `data-theme=dark` and the charcoal page at once, survives a reload; Light overrides a dark device; System removes the attribute and the `hh.theme` key. `color-scheme` is `light dark` for System, `dark` or `light` for the overrides.
- **No flash:** I held back every stylesheet, script and font by 1.5 s and looked at the page before any CSS arrived, for four cases (system dark, saved nothing; system light, saved Dark; system dark, saved Light; system light, nothing). The page colour was right in all four from the first paint (charcoal, charcoal, cream, cream) and unchanged when the CSS arrived (`flash-*.png`).

### S8-03 shared components: Meets (N11)
Pill buttons (fern primary, cream secondary), 14 px cards, chips, segmented controls and the sheet with a grab handle all read as one set in both themes. 44 px holds everywhere the tap-target script looks. N11 lists the native bits left.

### S8-04 Home and navigation: Meets (N6, N9, N12)
- **Five-second test, Home:** passes. Logo, "Good morning", the date and "Week 9 of 38", then Track work, Schedule and Set up cards; one thing needs you ("Last week needs a quick check"). Light and dark both match the mockup closely; there is no name in the greeting (a recorded decision) and the briefing line sits above the cards when there is one.
- **Tabs:** Home · Track work · Schedule, with icons and labels; Home is one tap from anywhere, Track work and Schedule switch in one tap; Schedule has Week | Year tabs, and the choice is remembered (Year, leave, come back to `/schedule` or tap Home's Schedule card: still Year).
- **Avatar button:** opens a sheet named for the family with Family settings (whose description says "appearance") and Sign out. Appearance is one tap further, as recorded.
- **Old links** (browser, query kept): `/timeline` -> `/schedule?view=year`; `/timeline?zoom=month` -> `/schedule?view=year&zoom=month`; `/kids?add=1` -> `/setup/children?add=1`; `/subjects?show=archived` -> `/setup/subjects?show=archived`; `/schedule/assignments?q=hobbit&x=1` -> `/setup/assignments?q=hobbit&x=1`; `/schedule/days-off?x=1`, `/schedule/events?x=1`, `/schedule/settings` -> `/setup/...`; unknown routes show "Page not found". Edge cases in N12.

### S8-05 this week as pastel bars: FAIL (N1, N7, N13)
- **Meets:** header and prev/next, the Frank | Margaret | Both switch (remembered, shared with Track work), grouped bars for Both, one quiet line per event ("Tue · Co-op"), the empty states ("Nothing planned this week.", "No children yet" with a button), a bar opens the adjustment sheet, and Save gives an undo bar that works (below).
- **Fails:** the range on every bar for work already under way (N1), which breaks "nothing on the page is a number the family didn't enter" in spirit. N7 and N13 are small.

### S8-06 check-in: Meets (N10)
- The question card stays until answered: it is still there after leaving and reloading; Home's card and Schedule's line both point at it.
- **Yes, all done** sends `PUT /api/check-ins/2026-10-19` with `items: []` and the card goes ("Thanks!"); Home's "needs a quick check" line goes too.
- **Not quite** shows the bars with round 44 px checks; a bar's body opens Update status. At 360 and 320 px the three outcomes are one row ("As planned" 104 and 91 px wide, 44 high, no wrap), the stepper and Cancel / Save are 44+ px. (`update-status-360.png`; the 320 dark shot `tr-sheet-320-d.png` is in the scratchpad.)
- **Fell behind, got to lesson 33, Move to** sent `{position: 33, mode: "pushEndDate"}` and Math 5's plan end moved ("plan ends May 25"). In a second case, Science 5 behind to lesson 24 with "Move to 18 May": the plan then said "plan ends May 18, 2027", so the promised date matches. The Keep and Move dates recompute as the number changes.
- Removed controls (chips, slider, per-row steppers, Skip) are gone. See N10 for the missing hint.

### S8-07 Year timeline: Partial (N2, N3, N8, N14)
- **Meets:** rounded pastel bars with a thin outline, the grey All strip with a chart icon, a dotted fern Today line with a pill, gutter badges with icons (letter for a custom subject), bars carry only assignment names ("Black Beau...", "The Wind i..."), lanes sit close, dark fills and strong tones read, drag is off (a mouse drag of a bar at 1280 sent no request and moved nothing), no grips. Compared with `soft-paper-year-badges.png` it matches in both themes (`year-360-light.png`, `year-360-dark.png`).
- **Fails:** the popover (N2) and the edit bar on wide screens (N3). The badge tap feel is N8; "Update time estimate" opens from More on a phone with the right wording ("We estimated about 15 min a day (about 7.5 pages a day)", chips 15/30/45/60/Custom).

### S8-08 set up screens: Partial (N5, N11)
All six lists (Children, Subjects, Assignments, Days off, Events, plus Family settings) use 56 px list rows with chevrons, pill Add buttons, and sheets for Add several, Import CSV, Use a template, Save as a template and both Copy panels; they read well at 320, 360, 390 and 1280 in both themes, and Events > Add event works for a non-demo family (preview list of "what changes" shows). The behaviours I touched (add child, add subject, add assignment, add days off, edit) all work. **Not done by design:** the calm calendar popover, steppers for totals and "essentials first, the rest under More" (S8-08 step 2); the developer recorded this and asked Will, so the ticket's step 2 is only partly met. N5 is a real regression at phone widths.

### S8-09 first run and empty states: Meets (N9)
A brand-new family (`e@example.com`) signed in and reached a planned week through Home's checklist alone (below). Every empty screen says what to do next and has the button: Week ("No children yet" + "Add your children"; with children but no work "Nothing is planned yet"), Year ("Nothing planned yet. Tap + Add assignment..." with the calendar still drawn), Track work ("Nothing was planned last week... See this week"), Children, Subjects (the 14 common subjects as one-tap chips), Assignments, Days off, Events.

### S8-11 subject icons: Meets (N5)
The 20-icon picker (44 px chips, "Letter" first) is on the subject form; the form suggests the icon while typing ("Woodworking" gets the letter W; Math gets the calculator); icons show on Week bars and check-in bars, Set up's Subjects rows, the assignment form's subject select and as Year badges. Starter subjects have their defaults (book, calculator, scroll, flask, music, palette in the demo).

## Brand-new family, sign-in to a planned week (via Home's checklist)

Phone, 360 px, empty family, all in the browser:
1. Home shows "Getting started" with four open circles: Add your children, Add subjects, Add your books and lessons, Set your year's breaks, and Hide. (`new-family-home-360.png`)
2. Add your children -> Children -> Add child -> Frank, then Margaret. Back on Home the first row reads "Done".
3. Add subjects -> the 14 common subjects as chips; tapped Math, Reading, Literature, History, Science, each added at once. Row 2 "Done".
4. Add your books and lessons -> Assignments -> Add assignment: Literature, Treasure Island, Frank, 2 Nov - 18 Dec, pages, 300; then Math 5 (Frank) and Math 3 (Margaret), 100 lessons to 14 May. Each shows "about N min a day". Row 3 "Done"; the Schedule card says "on track to finish 14 May".
5. Set your year's breaks -> Days off -> Add days off: "Thanksgiving break", 23-27 Nov. The checklist disappears, and stays gone after a reload.
6. Schedule -> Week: this week (31 Oct) is "Nothing planned this week."; Coming week shows Frank's Math 5 "lessons 1-4" and Treasure Island "pages 1-50" (correct, since both start that week), and Track work says "Nothing was planned last week."
7. No console errors apart from the expected 401 on the sign-in screen's session check. A brand-new family can get to a planned year with nothing else visited. See N9, N13.

## Screen tests (DESIGN_DIRECTION) and the mockup

| Screen | Five seconds | One job | No duplicates | Parent's words | Empty state | Phone first (320/360, 44 px, no sideways) |
|---|---|---|---|---|---|---|
| Home | Pass | Pass | Pass (the Set up row and avatar are different things) | Pass | Checklist | Pass |
| Track work | Pass (N10 after "Not quite") | Pass | Pass | Pass (lessons, pages, minutes) | "Nothing was planned last week" | Pass |
| Schedule, Week | Pass | Pass | Pass (a bar and the sheet agree once N1 is fixed) | **Fail**: wrong ranges (N1) | Pass | Pass |
| Schedule, Year | Pass | Pass | Pass | Pass (no numbers) | Pass | Pass except the 24 px badges (known) and N3 on wide screens |
| Set up and its six lists | Pass | Pass | Pass | Pass ("effort" word, N11) | Pass | Pass (N5 at 320 and 360) |
| Add forms and sheets | Pass | Pass | Pass | Pass | n/a | Pass (N11 clipping) |

Parent-facing screens show no engine numbers: I scanned the text, labels and tooltips of all 11 screens and the Add forms for decimals, "effort", "points", "weight", "thickness", "rate", "capacity" and "load": none, apart from the word "effort" on the subject form (N11). The plan debug table only appears with the developer flag. Against the mockup (`soft-paper.png`): Home, Schedule and Track work match closely in structure and mood; differences are the intended ones (no name in the greeting, the Track work board shows both children's rows under one switch, Year keeps its chips, N14).

## Sprint 8 decisions: held

- **Home · Track work · Schedule:** yes, with icons.
- **Schedule with Week | Year:** yes; remembered.
- **One child at a time plus Both:** yes on Week and Track work, remembered, "Both" groups by child; Year differs (N14).
- **Check-in until answered:** yes (above).
- **Icons on every subject:** yes (S8-11).
- **Calm bars, drag off:** yes; mouse drag of a Year bar sends nothing.
- **No engine numbers on parent screens:** held, but see N1 for numbers that are wrong rather than internal.

## Nothing from Sprint 7b regressed

Checked in the browser on the new screens:
- **Undo:** Week, Coming week, History spine down one and Math 5 up one, Save: one `PUT /api/week-overrides/batch`, the bar "Adjusted week of Nov 2." with Undo; Undo sent `POST /api/undo` and the bar went back to "lessons 1-5". (The label no longer names the child or the count that the 7b note wanted; Low, not numbered.) "Moved Late Reader's end to Jun 26." also has a working Undo.
- **Late line with Move end / Keep:** Home and Schedule, Week show "Late Reader won't finish this school year at this pace." with "Move end to Jun 26, 2028" (45 px) and "Keep Nov 27, 2026" (44 px); Move end moves it and is undoable; Keep hides the line.
- **Update time estimate:** Year, select a bar, More, Update time estimate opens with the estimate sentence and the five chips (at 360 px the sheet is a bottom sheet; at 1280 px it needs N3 fixed to reach it by mouse). The check of which chip is preselected (7b N2) was not repeated here.
- **Week adjustments:** the sheet lists the child's assignments for the week with "One less / One more", "Back to plan" and Save, all 44 px.
- **Check-in labels at 360 px (7b R1):** "As planned" stays on one line; the tick sits beside the title.

## Tap targets

`TAP_WIDTH=360 node flow.mjs tap-targets` (the repo's script, signed in as the non-demo `p@example.com`, with `CHROME_PATH` set), light, then dark (a profile with `hh.theme=dark`, since the script cannot set the theme), then `TAP_WIDTH=320` in light: every screen, panel and sheet prints "none" except Schedule (Year, bar selected): **11 undersized, all `.tl-badge`** (24 x 20 to 24 x 105), identical in the three runs. Events > Add event was measured ("event preview list shown: true", no undersized control).

**The Year badges, how they feel (N8).** I tapped each of the 11 badges with a simulated fingertip (offsets within 10 px sideways and 12 px up and down of the badge centre, 385 taps in all): 89 percent hit the badge they aimed at, **0 hit a wrong lane**, 11 percent hit nothing. The larger badges (46 to 105 px tall) were reliable; the four small ones (Science Margaret 20 px, Art Margaret 21 px, Music Margaret 23 px, Music Frank 31 px) hit 22/35, 22/35, 23/35 and 32/35. Sideways, a tap 10 px to the left of centre still lands; 16 px to the right lands on the grid, and a tap a little further right would select a bar, which is the natural fallback. With a 2 to 4 px gap between badges nothing steals the tap. So the gutter does not need to be wider, but the small badges need more height to tap: **keep the 24 px gutter and give every badge a tap area at least 32 px tall** (the lane can be shorter than its hit area; at most a little overlap with neighbours' padding), and fix the popover (N2) so the tap pays off. The screen-reader lane list is not a substitute for a parent with a thumb.

## Developer's unchecked items

- **Events > Add event with a non-demo family:** done, clean (above).
- **320 px:** every screen has no sideways scroll (`scrollWidth` equals the window at 320, 360, 390 and 1280 on all 11 screens, both themes); the tap-target script at 320 is clean except the badges; N5 is the one 320 layout fault.
- **Dark mode on the setup screens:** viewed Children, Subjects, Assignments, Days off, Events (including the Add form and Add several sheet) and Family settings; all read well (N11 for the native bits).
- **scripts/smoke/scenarios:** 20 of 26 fail on the old screens (N6).

## Not tested

- A real phone or Safari (Chromium only). The device colour scheme was emulated by the browser, not set on a device.
- Print, very large text sizes, and the install prompt.
- Whether the service worker keeps working offline: it has no offline cache by design.

---

# Re-test (S8b-08)

Re-test of N1 to N14 after Sprint 8b (commits 17604d9..4f3a886), by the same tester agent (so the same independence note applies). Date: 2026-11-01. Head 4f3a886. No source or test files were changed; this section and six screenshots (`docs/reviews/sprint-8/retest-*.png`) are the only additions. Scratch database `hh_s8b_dev` (dropped), API and Vite on 127.0.0.1 only.

## Result: PASS. All three High findings and all Medium findings are fixed; the gate is ALL GREEN; 2 new Low observations

- `bash scripts/check.sh`: **ALL GREEN**. Counts from the gate's log: **1007 api** (68 files), **1030 web** (79 files), **123 db** (19 files), **420 engine** (29 files), and 420 engine in each of the 7 `test:tz` zones.
- Browser checks at 320, 360, 390 and 1280 px in light and dark, on a copy of the demo family, a second copy, a family with 6 children, a family with one child and an empty family. All 11 screens at all four widths in both themes: no sideways scroll (88 page loads, 0 overflow). Text contrast on every screen in both themes (my script, all text nodes against their real backgrounds): nothing under 4.5:1 (lowest 4.86 in light, 5.98 in dark, as before).
- `tap-targets` at 360 light, 360 dark, 320 light and 320 dark (non-demo family, so Events > Add event is measured too): each reports exactly the 11 known Year badges at 24 px wide and nothing else; every badge is now at least 32 px tall (the four that were 20 to 23 px are 32 px). "Events > Add event" measured clean ("event preview list shown: true").
- Smoke scenarios with `scripts/smoke/seed-second-family.ts` (`smoke@example.com`, `empty@example.com`; `SMOKE_EMAIL` set): **22 of 23 exited 0 in one batch** (including `axe-2a`, now clean, `track`, `kids-list`, `subjects-list`); the four `tap-targets` runs above are the 23rd scenario. `s2a-13-settings` timed out at sign-in in the batch and **passed when run again on its own** (all its steps and screenshots). The cause is the login limit (the API allows 10 sign-ins a minute; my own parallel browser checks used some). See N16.

## Per finding

| # | Was | Re-test | Evidence |
|---|---|---|---|
| N1 | High | **Fixed** | Schedule Week now starts mid-book and matches Track work. This week: The Hobbit chapters 13-16 (last week on Track work: 10-13), Math 5 lessons 35-39 (31-35), History spine 30-34 (25-30), Science 5 26-30 (22-26), A Child's Garden of Verses pages 61-80 (41-60). Stepping on: Hobbit 16-19, then "chapter 19" (the last one); Math 5 39-44, 44-48. The Week's "Last week" (19-25 Oct) shows the same bars as Track work. A new family's first week still starts at 1. The same at 320 dark. One quirk: the boundary number is shared (last week ends at 35, this week starts at 35) because ranges round outward; that is the engine's own rule and Track work does the same, so not a defect. |
| N2 | High | **Fixed** | The popover shows the whole name ("Literature · Frank", 121 x 27 px) for all 11 badges at 320, 360, 390 and 1280, light and dark; none is clipped and none runs off the screen edge (`retest-year-popover-360-dark.png`). |
| N3 | High | **Fixed** | At 1280 x 800 (light and dark), 1024, 768, 640, 390, 360 and 320 the edit bar's bottom is exactly the tab bar's top, nothing covers Start, End, Copy or More, and a mouse click (or tap) on More opens "Update time estimate / Reset to original" (`retest-edit-bar-1280-dark.png`). |
| N4 | Medium | **Fixed** | One colour per subject on Set up (badge), Week bars and Year badges, in both themes (read from the computed backgrounds): Literature lilac, Math mint, History honey, Science sky, Music butter, in light and in dark, identical in the three places. Art is mint like Math (it was green before; the nearest swatch is mint). See N15. |
| N5 | Medium | **Fixed** | Every subject name on Set up is whole at 320, 360, 390 and 1280; Math's "about 40 min a lesson" pill sits under its name on phones (`retest-subjects-320-dark.png`). |
| N6 | Medium | **Fixed** | 22 of 23 scenarios in one batch, the 23rd on its own (above); see N16 for the one flake. |
| N7 | Low | **Fixed** | A Week bar's accessible name is its visible text ("Treasure Island pages 1-43", no `aria-label`); `axe-2a` passes on Week and every set-up screen. |
| N8 | Low | **Fixed** | Every badge is at least 32 px tall and 24 px wide, gaps 2 to 4 px (none overlap), at all four widths. With the same simulated fingertip as before (385 taps, 10 px sideways and 12 px up and down), 98 percent hit the badge aimed at (was 89), none hit a wrong lane; the four small badges went from 22 or 23 of 35 to 33 of 35. The gutter did not need widening. |
| N9 | Low | **Fixed** | Home's Track work card says "Nothing planned" for a child with no work this week. |
| N10 | Low | **Fixed** | After "Not quite": "Untick what didn't get done, or tap a bar to update it." |
| N11 | Low | **Mostly fixed** | In dark: radios now take the fern accent (rgb 156,203,184) on Family settings, the event form and "Who it's for"; the "Usual days" and other fieldsets have no border; the Subject form says "Usual time (optional)" (no "effort"); long select choices end in an ellipsis ("Use default (Norm...") instead of being cut mid-letter (`r11` shots in the scratchpad). Left: a date field at 360 px still shows "mm/dd/yyy" with the last letter under the calendar icon, and the select text is shortened by an ellipsis. Cosmetic; I would not spend a ticket on it. |
| N12 | Low | **Fixed; the new rule is sensible** | `/timeline?view=x&foo=bar` -> `/schedule?view=year&foo=bar` (Year wins). `/timeline?zoom=month` keeps its query. Known set-up routes still redirect with their query (`/schedule/assignments?q=hobbit&x=1` -> `/setup/assignments?q=hobbit&x=1`, days-off, events, settings; `/kids`, `/subjects`). `/schedule`, `/schedule?view=year&x=2` and `/schedule/` stay the Schedule. Any other `/schedule/...` address (for example `/schedule/foo?x=1`) goes Home, dropping the query. That is a good call: `/schedule` cannot be both the new tab and the old hub, an unknown sub-address has no screen to land on, and Home is the one place that is always right. The only old address that lands somewhere else than before is a bare `/schedule` (old hub, now the Schedule), which cannot be told apart. `/plan` and `/nonsense` still show "Page not found", as before. |
| N13 | Low | **Fixed** | "This is a heavy week for Solo." sits in a soft accent card with no bare name line above it (`retest-heavy-week-360.png`). |
| N14 | Low | **Fixed, works as Will asked** | See below. |

## N14: the shared child switch

- **Same switch on Week, Track work and Year** (the same `child-switch` element and options on all three, at 320, 360, 390 and 1280, light and dark), with no sideways scroll on any of them.
- **Two children** (All children, Frank, Margaret): chips at every width from 320 up, "All children" first. Week and Track work open on Frank, Year on All children (the developer's recorded defaults); once a choice is made it is shared: choosing Cecilia in Week's sheet shows Cecilia in Track work's and Year's pill, Year narrows to Cecilia's one subject badge, and choosing All children on Year puts Week on "All children" with every child's work grouped under their name.
- **Six children** (Frank, Margaret, Alexandra, Bartholomew, Cecilia, Dominic): chips at 1280 (all seven options on one line); at 320, 360 and 390 a single 44 px pill ("Frank ▾", 93 px wide) that opens a bottom sheet "Whose work?" with All children first, then each child, as 52 px rows, a check on the current one, and a 44 px close button; Esc and the close button close it. Nothing scrolls sideways (the switch is not scrollable, the page width equals the window at every width). (`retest-child-sheet-360-dark.png`)
- **One child and no child:** no switch at all on any of the three screens.

## New findings

- **N15 (Low, S8b-04):** two subjects can share a colour. Because a subject's colour is now its stored hue's nearest swatch, Art (an off-palette green) and Math are both mint on Set up, Week and Year (`r8b-year-360-l.png` in the scratchpad). They are told apart by their icons (calculator and palette), which is what Will chose them for, and there are only eight swatches, so this is expected; mention it if a family wonders why two subjects match.
- **N16 (Low, S8b-06):** the smoke runner has no spacing between sign-ins, and the API allows 10 per minute, so a batch (or a batch plus other browser work) can fail a scenario at sign-in: `s2a-13-settings` did once and passed alone. Adding a short pause to `flow.mjs`'s login, or running the scenarios with a pause between them, would make a batch repeatable.

## What Will should look at first (updated)

1. **The family-switch sheet with many children** (`retest-child-sheet-360-dark.png`): this is the new thing you asked for, and it works.
2. **Schedule, Week** next to **Track work** (`retest-week-360-light.png`): the numbers now agree.
3. **Year**: tap a badge for the name (`retest-year-popover-360-dark.png`); on a laptop select a bar and use More (`retest-edit-bar-1280-dark.png`).
4. **Set up, Subjects** at 320 (`retest-subjects-320-dark.png`) and a week with a heavy-week note (`retest-heavy-week-360.png`).

## Not re-tested

- A real phone or Safari (Chromium only), print, and very large text sizes (as before).
- The 7b "Update time estimate" preselected chip, and the undo, late-line and week-adjustment flows beyond what the smoke scenarios cover; I did not change anything there and they passed in the first pass.
