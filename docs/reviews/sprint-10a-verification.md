# Sprint 10a verification (the Year view)

This is the tester pass for Sprint 10a: S10-01 to S10-08, S10-04b, S10-04c and S10-15. Each ticket was checked against its "Done when", against the mockups `docs/design/mockups/year-polish*.png`, and against DeeDee's decisions. It was run on branch `hh2/sprint-10` at commit 1693bc7. The commits under test were:

- S10-01 bea44b8
- S10-02 fa80631
- S10-15 e631c61
- S10-03 51cef65
- S10-04 b5f33d1
- S10-04b 9cd926c
- S10-04c dfd1c45
- S10-05 af89c39
- S10-06 8a50218 and 206353d
- S10-07 6383476
- S10-08 1693bc7

This is S10-10a. Date: 2026-11-04.

I changed no product code, test code or repo scripts. This report is the only file I added. The screenshots and my own scripts stay on the tester's machine (paths below) and are not committed.

> **Where the scripts are:** the S10-10a ticket says the tester's own scripts should be "kept beside the report". The coordinator's brief said to commit only this file. I followed the brief. The scripts are in `/workspace/hh-s10a-test/pw/` (Playwright with axe-core, listed under Setup). If Will wants them in the repo, they can be copied into a folder such as `docs/reviews/sprint-10a-scripts/` in a separate commit.

> **Independence note:** I am a separate tester agent. I did not write or review the Sprint 10 code, and I ran everything on my own stack: my own embedded Postgres 16, ports, database and browser scripts. However, the same coordinating agent wrote the tickets, directed the coding agent and briefed me. So this is not an independent review by a different person or team.

## Verdict: NOT READY for a PR to main (one Medium, small fix)

Most of Sprint 10a works as the tickets describe:
- Lanes are grouped by child, with one Together group.
- The axis is sticky, with the Today pill in it.
- Bar heights follow effort and rescale per view.
- Labels fit.
- Badges are 44 × 44 and win over the bar zone.
- The edit sheet and Add sheet match the mockups.
- The title row works.

The **24 px badge finding from Sprint 8 and Sprint 9 is closed**. The gate is ALL GREEN and every smoke scenario passes.

**One ticket fails its Done when.** S10-05 requires that bars run unbroken under a break. In the demo family, Frank's **Piano practice** is still split at Thanksgiving, winter break and spring break, in light and dark (M1). The cause is narrow: Frank's Friday piano lesson leaves the Friday before each break with no Music work, so the break-bridging rule sees an open school day and keeps the gap. The fix is probably a few lines in `bridgeBreaks` plus a test. After that, re-check S10-05 only. Everything else can go to main as is.

Numbers:
- **Gate:** `bash scripts/check.sh` came back **ALL GREEN** ("ALL CHECKS PASSED"). The steps are lint, typecheck, build, db:reset, test, test:tz and db:validate. Tests passed:

  | Package | Tests | Change since Sprint 9b |
  |---|---|---|
  | engine | 420 | 0 |
  | api | 1048 | 0 |
  | web | 1203 | +71 |
  | db | 141 | 0 |

  `test:tz` ran the 420 engine tests in each of its 7 zones.
- **10a tickets:** **10 pass, 1 partial** (S10-05, see M1). None fail outright.
- **Smoke scenarios:** **23 of 23 pass on the first run.** `s2a-13-settings` (R7) passed this time. During the run, `axe-2a` logged one colour-contrast hit on the Add assignment submit button with errors at 1280. It came back clean on 2 re-runs, so I count it as a transient (L7).
- **Browser sweep (Year):** 12 combinations: 320, 360, 390, 840 and 1280 px in light and dark, plus high contrast at 360 and 1280.
  - Nothing scrolls sideways.
  - axe found **0 violations**.
  - No control is under 44 px.
  - No bar label is cut or clipped.
- **Tap targets:**
  - The repo's `tap-targets` script finds **no Year badges** at 320, 360, 390 or 1280, in both families. In Sprint 9 and 9b it found 11 every time.
  - It now reports 4 per run. These are the text inputs inside the date tiles (28 px tall), in the edit sheet and the Add sheet.
  - Each input sits inside a 60 px tall `<label class="tl-tile">`. A tap on the tile's top-left corner focuses the input, and a tap on its bottom-right corner opens the calendar, at 320 and 360. So the real target is 60 px. This is a limitation of the script, not of the app (L6).
- **Findings:** 1 Medium (M1) and 8 Low (L1 to L8). The 9b carry-overs R3, R4 and R6 are still open, with R6 only partly closed (details below).

## Setup

- **Database and servers:**
  - My own embedded Postgres 16 on 127.0.0.1:5472, with scratch databases for the gate and for dev.
  - The API ran on 127.0.0.1:3919 and Vite on 127.0.0.1:5919.
  - There were no tunnels, nothing was exposed and nobody was contacted.
  - The Vite port came from an untracked local config file, which I deleted before committing.
  - For comparisons with 9b, I built e8dab0d in a temporary worktree outside the repo, which I removed before committing.
- **Browsers:**
  - Chromium through Playwright, with axe-core injected.
  - I also ran the repo's Puppeteer smoke scripts, pointed at the same Chromium with `SCREENS_DIR` outside the repo, so `docs/progress/screens` was not touched.
- **Families:**
  - The demo family (`demo@example.com`: Frank and Margaret).
  - The second family from `scripts/smoke/seed-second-family.ts` (`smoke@example.com`), used for everything that writes. Extra children were added to it through the API for the 3-child and 5-child checks.
  - The empty family (`empty@example.com`).
  - I reseeded the dev database before the smoke run and again at the end.
- **Dates:** "today" was the real Wednesday, 4 November 2026. The Year runs Aug 31, 2026 to May 21, 2027. The seed has Thanksgiving week, winter break and spring break as family days off.
- **Screenshots and files:**
  - Screenshots: `/workspace/hh-s10a-test/shots/` and `/workspace/hh-s10a-test/smoke-screens/`.
  - Logs and data: `/workspace/hh-s10a-test/`. This includes `check.out`, `smoke.out`, `smoke-logs/`, `regress.out`, `heights-*.tsv`, `heights-cram-compare.txt` and `ysweep-demo.json`.
  - Scripts: `/workspace/hh-s10a-test/pw/`. The main ones are `ysweep`, `heights`, `cram`, `three`, `scroll`, `five`, `labels`, `tap`, `tile2`, `sheets`, `layers`, `addcmp`, `wash`, `ribbon2`, `r3`, `r4`, `r6` and `regress`.

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S10-01 Sheets above the tab bar | **Pass** | At 360 and 1280 the following sheets are fully visible, and their buttons are not covered by the tab bar or anything else (hit-tested at each button's centre): Year edit sheet, its More menu, Update status, Add assignment, the Subject picker and the Log sheet (smoke family, with Log setup on). `layer-*-360.png`, `layer-*-1280.png`. The mockup caption says the edit sheet "covers the tab bar"; on the phone it sits directly above the tab bar instead. Nothing is hidden either way. I didn't open the child dropdown sheet on its own. |
| S10-02 Lanes grouped by child | **Pass** | "History spine" shows once, under Together, as "History spine · F M". For a 5-child family I gave the smoke family Ned and Olive, and a "World history" shared by L, N and O. It has **one** Together group holding "World history · L N O" and "History spine · F M". Badges are 44 × 44 and centred on their lane's first row at 360 and 1280 (`five-kids-360.png`, `five-kids-1280.png`). **Ribbons count shared work:** a temporary child "Zed" whose only work was shared with Frank got a load ribbon across that assignment's dates (`ribbon-shared-only-1280.png`). A child with only shared work gets a header with no lanes under it (L4). |
| S10-03 Today in the axis | **Pass** | The axis and Today pill stay pinned at the top while the lanes scroll (390, 3 children, scrolled 300, 600 and 900 px: `scroll-3kids-390-*.png`). The pill's box never overlaps a month label (`labels.mjs`: 0 overlaps at 320, 360, 390 and 1280, light and dark, at Year, Spring and This month). The dashed Today line stays clear of label text. |
| S10-04 Bar heights follow effort | **Pass** | See "Bar heights" below. Every bar height is in range: 8–28 on the phone (13.0–27.6 seen), and at most 31.6 on the desktop (cap 32). Loads at or above the 95th percentile draw at the maximum. One child versus All children rescales. Heavier and lighter weeks look different at Year, term and month. The `?debug=1&bars=` override works in dev builds only (max 27.6 by default, 35.6 with `bars=6,36,2`). |
| S10-04b Bar labels that fit | **Pass** | `labels.mjs` found **0** label problems (overflow, overlap between labels, an outside label over another bar, or off-screen) in the demo family and the 3-child family. It covered 320, 360, 390 and 1280, light and dark, at Year, Spring and This month. One short bar has no name at all (L2). |
| S10-04c Bar tap zones | **Pass** | No Year bar or badge control is under 44 × 44 at 320, 360, 390, 840 or 1280 (the sweep, plus the repo's `tap-targets` at four widths). Thin bars are selectable at their 44 px zone. I did not separately hit-test where a thin bar's zone meets the group header row (dfd1c45 covers that with unit tests). |
| S10-05 Breaks as a wash | **Partial (M1)** | The breaks are drawn as a soft band across every lane, with a wash, in both themes. Math, Science and the others run straight through them. **Frank's "Piano practice" is still split** at Thanksgiving, winter break and spring break, in light and dark (`wash-winter-1280-l.png`, `wash-winter-1280-d.png`). Steps to reproduce are under M1. |
| S10-06 Edit sheet as mocked | **Pass** | At 360, selecting a bar shows a 2 px outline and the sheet as mocked: 60 px Start and End date tiles, the rounded pace line, then Copy and More (48 px). Changing dates through the tiles saves the same data the old form did. axe is clean on the open sheet in light and dark. `layer-year-edit-360.png`, `r6-tile-360.png` |
| S10-07 Add assignment without browser controls | **Pass (L5)** | At 360, light and dark, the Year Add sheet uses the Subject picker sheet, the child chips, the date tiles and the soft weekday chips. I intercepted the POST from the Year Add sheet and the one from Set up › Assignments with the same inputs. **Both send the same body**: `subjectId`, `title`, `unitType: "lessons"`, `totalUnits: 40`, `weightPerUnit: null`, `startDate: "2027-01-04"`, `endDate: "2027-03-26"`, `childIds`, `weekdays: null`. The requests were answered with a 500 so nothing was saved. axe is clean. The chip labels are 44 px tall (the inputs inside are 42). The Unit control is still a native `<select>` (L5). `addcmp-year-360-l.png`, `addcmp-year-360-d.png`, `add-sheet-360-*.png` |
| S10-08 Title row | **Pass** | "+" (Add assignment) is 44 × 44 at the phone widths and 182 × 44 with its words at 840 and above. The pencil ("Edit views") is 44 × 44 and pinned at the end of the zoom row. Both open what they should, and their accessible names match the visible text or icon. |
| S10-15 Year badges, 44 px tap zone | **Pass** | Every badge is 44 × 44 at 320, 360, 390, 840 and 1280, light and dark (`ysweep`). The repo's `tap-targets` finds no badges at 320, 360, 390 or 1280, in both families. In the demo family at 390, tapping each badge selected its own lane and no other. **The badge beats the bar edge:** at 390, taps at x = 45, 46 and 47 (just right of the badge, where Math 5's bar starts) select the badge; x = 50 selects the bar (`tap-badge-edge-390.png`). |

**The Sprint 8 N8 / Sprint 9 finding (11 Year badges at 24 px) is closed.**

### Bar heights (S10-04), including DeeDee's side-by-side

- **All children vs one child:** screenshots are `h-demo-390-{Year,Fall,Thismonth}-{Allchildren,Frank,Margaret}.png` and `h-smoke-base-390-Year-*.png`. Per-bar heights are in `heights-*.tsv`.
  - The same assignment does rescale. Frank alone barely changes, because his loads set most of the 95th percentile anyway: Math 5 is 27.2 under All children and 27.0 alone.
  - Margaret alone gets about 2 px taller: History spine is 26.2 under All children and 28.0 for Margaret.
  - The direction and size of the change look right.
- **A cram week does not flatten the others:** in the smoke family I added a heavy one-week assignment for Frank (`cram.mjs`). `heights-cram-compare.txt` compares every other bar before and after.
  - Every other bar keeps its height at Year, under All children and under each child. The only change was a 0.2 px drop in one bar.
  - That is the 95th percentile working as intended: a single week cannot become the new maximum.
  - The cram bar itself is drawn in an extra row, which is capped at 80 % of the lane's maximum (22.4 px). So the heaviest week in the family looks shorter than Math 5 (L1).
- **Heavier vs lighter weeks:** Year, Fall and This month all show visible steps in the same bar (`h-demo-390-*.png`), with lighter weeks around the days off and heavier ones elsewhere.

### 3-child family at 390 px

For this check I gave the smoke family a third child, Lucy, plus overlapping books for all three (`three.mjs`, `scroll.mjs`).
- **Height:** at Year under All children, the page is 1252 px tall. The timeline itself is 888 px. At 390 × 844 that is about 408 px of scrolling, roughly 1.5 screens.
- **Scrolling:** smooth. The axis with the Today pill stays pinned, and each child's header (initial, name and ribbon) sticks under it while that child's lanes pass (`scroll-3kids-390-300.png`, `-600`, `-900`). Header text stays readable over the bars in light and dark.
- **One bar without a name:** in this family, "Frank's poetry" is drawn without a name: too short for an inside label, and no room for one outside (L2).

## Carry-overs from the 9b re-test

| # | Status | Evidence |
|---|---|---|
| R3 "All children" on one line at 320 | **Open** | At 320 with 2 children, "All children" still wraps onto two lines on Schedule (it is 44 px tall either way). With 3 children, the whole child switch wraps onto a second row at 390 and at 414. `r3.mjs` |
| R4 Zoom row scroll cue at 320 | **Open** | With a 30-character Fall name at 320, Spring and This month are hidden off-screen, and the only cue is the fade over the "…". This is unchanged from 9b. `r4-30char-320.png`, `r4-30char-360.png` |
| R6 Date placeholder margin at 360 | **Partly closed** | **Closed** in the Log form (the text ends 9 px before the calendar icon) and in the Year date tiles (13 px). **Open, and worse than in 9b, on Set up › Assignments and Set up › Days off at 360.** There, "Choose a date" and typed dates such as "Sep 30, 2026" run under the calendar icon (`r6-setup-assignments-360.png`, `r6-setup-assignments-row-360.png`, `r6-setup-days-off-360.png`). The cause is CSS order: `.field input[type="text"]` in `forms.css` sets `padding-right: 12px`, which overrides DateField's 48 px right padding because it has the same specificity and loads later. The 9b build has the same order, so this is older than Sprint 10, not a 10a regression (L3). |

## New findings

| # | Severity | Area | Finding |
|---|---|---|---|
| M1 | **Medium** | Year breaks (S10-05) | **One bar is still split at every break.** Demo family, Schedule › Year at 1280 (also at 390), light or dark: Frank's **Piano practice** stops before Thanksgiving, winter break and spring break, and starts again after each. The other bars run unbroken under the wash. **Cause:** the demo's "Piano lesson – Frank" event, every Friday, leaves no Music work on Fridays. So the Friday before each break is an open school day with no work, and `bridgeBreaks` (`smooth.ts`) keeps the gap, which is its documented rule ("any open school day keeps the gap"). An ordinary Friday plus weekend gap is under the 5-day split, so it does not split the bar. **Suggested fix:** when deciding whether a gap belongs to a break, don't count a school day as open if this assignment can't be scheduled on it (zero capacity for this assignment, such as the event day or a weekday it doesn't use). Add a test with a weekly event next to a break. Screenshots: `wash-winter-1280-l.png`, `wash-winter-1280-d.png`. |
| L1 | Low | Bar heights (S10-04) | A bar in an extra row is capped at 80 % of the maximum height. So a cram week placed in an extra row (22.4 px) looks lighter than an ordinary Math week (27.2 px). Only overlapping work in one lane goes to an extra row, so this is rare, but it can mislead. `h-smoke-cram-390-*.png` |
| L2 | Low | Labels (S10-04b) | A short bar with no room inside or outside gets no name at all. Examples: Frank's poetry in the 3-child family, and a few unnamed bars in the smoke family. The ticket allows this ("else none"), and the badge and edit sheet still name it. Mentioned so DeeDee knows it happens. |
| L3 | Low | Set up date fields (R6) | The placeholder and typed dates run under the calendar icon on Set up › Assignments and Set up › Days off at 360. This is older than Sprint 10. The fix is to raise the specificity of the DateField padding rule over `.field input[type="text"]`. See the R6 row above. |
| L4 | Low | Together groups (S10-02) | A child whose only work is shared gets a header row with a ribbon but no lanes under it (Olive in the 5-child check, Zed in the ribbon check). It reads correctly, but it looks empty. |
| L5 | Low | Add sheet (S10-07) | Unit is still a native `<select>`. Unlike the mockup, the subject is not preselected when the sheet opens. Neither breaks the Done when, which names the subject picker, child chips, date tiles and day chips. |
| L6 | Low | Smoke scripts | The repo's `tap-targets` flags the 4 tile text inputs (28 px) in the Year edit and Add sheets. The tile around each input is a 60 px label, and taps anywhere on it work (`tile2.mjs`). The script should measure the label, or skip inputs inside `.tl-tile`. |
| L7 | Low | Smoke scripts | In the full run, `axe-2a` logged one serious colour-contrast hit on the submit button of Add assignment with errors at 1280. It was clean on 2 re-runs. It is probably caught during a transition, like R7 in 9b. |
| L8 | Low | Sheets (S10-01) | The mockup caption has the Year edit sheet covering the tab bar. On the phone it sits above the tab bar instead. Nothing is hidden, so this is only a difference from the mockup. |

No High findings.

## Sprint 9 and 9b regressions: none found

`regress.mjs` (smoke family, 360) gave the same results as on 9b:
- **Redirects** still work and keep the query: `/track`, `/track?week=…`, `/timeline`, `/timeline?zoom=month`, `/kids` and `/schedule/settings`.
- **The Log form** opens with nothing prefilled (no filled boxes, no child pressed, only the school-day switch on).
- **The date field** reads "11/9/2026", "Nov 10, 2026" and "2026-11-11". "13/45/2026" and "11/9/26" keep the last good date, and an empty field clears.
- **Hours validation:** 25 h and 75 m give the same messages as in 9b.
- **Logging doesn't change the plan.** I compared `/api/assignments`, `/api/check-ins/weeks`, `/api/children`, `/api/events`, `/api/blocked-ranges`, `/api/week-overrides`, the whole-year plan and this week's plan. All were **IDENTICAL** after a create and after a delete.
- **No ISO dates** appear on Home, Records, Week, Year, Days off, Assignments or Family settings.

The `records` and `full-flow` smoke scenarios report "PROBLEMS: none".

## Smoke scenarios

`scripts/smoke/flow.mjs <scenario>` was run against 127.0.0.1:5919, with `SMOKE_EMAIL=smoke@example.com` for the scenarios that write. The database was reseeded first.

**23 of 23 exit 0 on the first run:**
- `auth`
- `axe-2a` (L7; clean on 2 re-runs)
- `axe`
- `edge`
- `engine-version`
- `full-flow` ("PROBLEMS: none")
- `kids-add`, `kids-edit`, `kids-list`
- `login`
- `plan-debug`
- `records` ("PROBLEMS: none")
- `s2a-12-hub`, `s2a-13-settings`, `s2a-14-assignments`, `s2a-15-days-off`, `s2a-16-events`, `s2a-17`, `s2a-hardening`
- `subjects-add`, `subjects-edit`, `subjects-list`
- `tap-targets` (4: the tile inputs, L6; 0 badges)

I also ran `tap-targets` with `TAP_WIDTH` set to 320, 360, 390 and 1280, each with and without `TAP_EMAIL=smoke@example.com`. All 8 runs exit 0 with the same 4 tile inputs and no badges.

## Browser sweep

- **Year view (S10-10a step 1):** 320, 360, 390, 840 and 1280 in light and dark, plus high contrast (`forced-colors: active`) at 360 and 1280. Screenshots are `ys-demo-*.png`.
  - No sideways scroll on any of them.
  - axe found 0 violations.
  - No control is under 44 px.
  - Labels are 12 px.
  - The axis is 42 px on the phone.
- **Sheets:** the Year edit sheet, More, Update status, Add assignment, the Subject picker and Log, at 360 and 1280. None is covered, and axe is clean on each.
- **Mockup comparison:**
  - The group headers, ribbons, Today pill, tiles, pace line and Add sheet match `year-polish*.png`, apart from L5 and L8.
  - The bar heights follow DeeDee's decision (dynamic heights, 95th-percentile maximum) rather than the mockup's 20 px cap, as the ticket says.
  - The desktop rail, side panel and wide layout are Sprint 10b, so I did not judge them.

## What Will should look at first

1. **Schedule › Year, demo family, Frank › Piano practice in late November and late December** (`wash-winter-1280-l.png`). This is M1: the one bar that still breaks at a break.
2. **The All children / Frank / Margaret side-by-side** (`h-demo-390-Year-*.png`) and **the cram week** (`h-smoke-cram-390-*.png`). Check you are happy with how much bars rescale, and with the 80 % cap on extra rows (L1).
3. **The 3-child family at 390** (`scroll-3kids-390-*.png`): about 1.5 screens of scrolling at Year. The child switch wraps at 390 with 3 children (R3).
4. **Set up › Assignments at 360 with a date filled in** (`r6-setup-assignments-row-360.png`): the date runs under the icon (R6 and L3). This is a one-line CSS fix.

## Re-test (2026-11-04, after fc6f467 and 9b5bfc7)

### Verdict: READY for a PR to main

M1 is fixed and L3 (R6) is fixed in the browser. The full gate is green. There are two new Low findings, and neither blocks the PR:

- **L9** is a test flake that only appears under heavy CPU load.
- **L10** is a cosmetic clip of the year in narrow date fields.

The rest of the earlier findings (L1, L2, L4 to L8, R3, R4) were outside this fix round. I did not re-check them, and they stay open as Lows.

### What was tested

- **Branch and commit:** branch `hh2/sprint-10` at 9b5bfc7.
- **The two fix commits:**
  - fc6f467: S10-05 fix (M1, `bridgeBreaks` skips idle days).
  - 9b5bfc7: S10-19 partial (date-field padding on Set up forms).
- **Environment:** the same isolated setup as above, all on 127.0.0.1 (Postgres on 5472, API on 3919, Vite on 5919). Before the browser checks, I reseeded the demo family and the smoke family.
- **No changes:** I changed no product code, test code or repo scripts.

### M1: bars run through the breaks: **Closed**

I checked Schedule › Year for the demo family at 1280 and 390, in light and dark.

**Bars across the breaks.** I parsed every `path.tl-band` into its drawn pieces and compared any gap between pieces with the break washes. The washes are Labor Day, Thanksgiving, winter break and spring break.

- There are 20 bars and **0 gaps at a break** at either width.
- Piano practice is one piece from September to May. Before the fix, it broke at Thanksgiving, winter and spring.
- Separately, I sampled `isPointInFill` on every pixel column inside each wash for every bar that spans it. Every such bar is filled across every column of every break. This covers Piano practice, Violin practice, Math 5, Math 3, Science 5, Nature study, History spine, Black Beauty, Science fair project, Heidi and Drawing basics.
- Screenshots: `retest-wash-demo-1280-l.png`, `retest-wash-demo-1280-d.png`, `retest-wash-demo-390-l.png`, `retest-wash-demo-390-d.png`.

**A real pause still shows.** The demo family is read-only, so I added the pause to the smoke family, which is a copy of the demo. It is an event, "Grandma visit", for Frank only: weekdays, Oct 12–23, with the rule "skip" for every subject. That gives a two-week stretch where the work is skipped and nothing is closed.

- At both widths, each of Frank's four bars (The Hobbit, Math 5, Science 5 and Piano practice) shows a gap for those two weeks. These are 4 non-break gaps.
- Margaret's bars and the shared History spine stay whole.
- The same bars still run straight through Thanksgiving, winter and spring.
- So idle days alone are never bridged, which matches the new unit test.
- Screenshots: `retest-wash-smoke-pause-{1280,390}-{l,d}.png`.
- Afterwards I reseeded the smoke family to remove the event.

### L3 / R6: date text under the calendar icon on Set up: **Closed**

I checked Set up › Assignments (the add form) and Set up › Days off (the add form) at 360 and at 390. I measured both the placeholder and a typed date ("12/30/2026", shown as "Dec 30, 2026"):

- The input now keeps its 48 px right padding.
- The visible text stops 16 px before the calendar glyph in every field.
- Nothing runs under the icon.
- Screenshots: `r6fix-assign-360-empty.png`, `r6fix-assign-360-typed.png`, `r6fix-daysoff-360-empty.png`, `r6fix-daysoff-360-typed.png`, plus the matching `-390-` files.

The Year date tiles keep their own padding. The tile rule `.tl-tile .date-field .date-field-box input[type="text"]` (0,4,1) still beats the new `.date-field .date-field-box input[type="text"]` (0,3,1), and the new CSS test in `date-field.test.tsx` covers this. I did not re-measure the Log form in the browser this time. After the reseed, the smoke family's Records page asks for a state before Log appears.

### Gate: `bash scripts/check.sh`: **all green**

| Suite | Tests passed |
|---|---|
| engine | 420 |
| api | 1048 |
| web | 1206 (+3 from the fix commits) |
| db | 141 |

The exit code was 0.

### Flake check: "Copy in the edit bar … Cancel"

**Results:**

- **Alone:** `vitest run test/timeline-edit-bar.test.tsx` passed 10 of 10 runs, 16 tests each.
- **With assignment-weekdays:** running it together with `test/assignment-weekdays.test.tsx` passed 3 of 3 runs.
- **Timeline folder:** `vitest run test/timeline` (19 files, 274 tests) passed 3 of 3 runs.
- **Under heavy load** (two full web suites at once, plus edit-bar runs in parallel), it failed every time:
  - Both full runs had 4 of 1206 tests fail.
  - All 3 edit-bar runs had 2 failures each.
  - The failing tests were the two Copy tests in `timeline-edit-bar.test.tsx` ("opens the Add sheet prefilled; saving sends one POST…" and "Cancel closes the sheet…"), and the two "Copies from the timeline (S4-07)" tests in `assignment-weekdays.test.tsx`.

**Cause.** This is a test issue, not an app bug. In every failure, the extra request is `POST /api/plan/pace` with `{ drafts: [...] }`. S10-06 (8a50218) added it in `TimelinePage.tsx`: `usePace(selectedDraft, 150)` asks for the selected bar's pace 150 ms after a bar is selected.

- The endpoint is read-only ("Nothing is saved").
- The tests count every POST (`method === "POST"` or `method !== "GET"`) as a write.
- On a fast machine the test finishes before the 150 ms timer fires. Under load it doesn't, so the pace request is counted as an extra write.
- Cancel does not save anything: the extra body is the pace draft, not an assignment.
- The fix commits don't touch this code, so the flake predates them.

### New findings in the re-test

| # | Severity | Area | Finding |
|---|---|---|---|
| L9 | Low (test only) | Tests for Copy in the edit bar and Copies from the timeline | These tests are flaky under CPU load. The read-only `POST /api/plan/pace` that S10-06 sends 150 ms after a bar is selected gets counted as a write. **Suggested fix:** in `timeline-edit-bar.test.tsx` and `assignment-weekdays.test.tsx`, leave `/api/plan/pace` out of the POST and non-GET filters, or filter on the assignments paths. The app needs no change. |
| L10 | Low (cosmetic) | Set up › Assignments and Days off, Start/End fields at 360 and 390 | With the padding fixed, the two date fields side by side are too narrow to show a whole date. "Dec 30, 2026" is clipped to "Dec 30, 2" at 360 and "Dec 30, 20" at 390. The placeholder is clipped to "Choose a". Nothing overlaps the icon. **Suggested fix:** stack the two fields below about 400 px, or shorten the placeholder. |

### Not re-run

I did not re-run the smoke scenarios or the full browser sweep. The two fix commits only change the timeline's break bridging and one CSS selector, and the gate and the targeted checks above cover both.
