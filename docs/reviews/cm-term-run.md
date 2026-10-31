# Charlotte Mason term run (S7-13)

> This run was done by an evaluator agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

Screenshots: `docs/progress/screens/cm-term-run/` (390 px wide, Chromium). File numbers are quoted below.

## How it was run

- Scratch database `hh_cm_dev`, a new non-demo family ("The Hartwell Family", America/Chicago) with its own login, children Clara (about 10) and Theo (about 7). Both servers started against it and stopped afterwards; the database was dropped.
- **Moving "today".** The API has no supported setting for a different "today": `app.now` is only injectable through `buildApp(config, { now })`, `server.ts` never reads it, and the `asOf` query only exists on `/api/plan` (the web app uses it only behind `?debug=1`). Substitute used: a small launcher kept outside the repo (scratchpad) that calls the real `buildApp` with a clock read from a file, so every API "today" (check-in week, briefing, event preview) moved honestly. The browser clock was pinned to the same instant with Playwright's clock. No repo file was changed. The term is Jan 11 to Apr 2, 2027. "Today" was moved to Jan 18, 25, Feb 1, 8, 15 and 22, one check-in each.
- Not done: bar dragging (off by design), the timeline edit bar's own "Copy" button, "Copy to a new year", the axe and tap-target smoke scripts. A quick check found no sideways page scroll at 390 px on any of the 9 screens, and one element under 44 px on every page (not identified).

## Setup

What was built: 8 subjects (Math, Literature, History, Nature Study, Picture Study and Composer Study on Fridays only, Hymn Study, Copywork), 18 assignments (10 by Add several in four batches, 7 by CSV import, 1 by Copy to another child), school days Mon-Fri, the Sabbath template (6 on, 1 off) plus MLK Day, Presidents' Day and Good Friday, a Tuesday co-op event (skip by default, Math lighter), and two custom zoom views ("First six weeks", "Last six weeks").

Easy:
- Kids and Subjects are quick. The Usual-days chips on a subject made "Fridays only" trivial (06, 08, 09). Usual effort in minutes per lesson ("about 20 min a lesson") is in a parent's words (17).
- CSV: the template downloads, the preview lists every row, a typo gives "Line 2: no subject named Maths." and nothing is imported (15, 16).
- The Sabbath template preview ("4 breaks to add: MLK Day Jan 18, Presidents' Day Feb 15, Break Feb 22-28, Good Friday Mar 26") is clear and right; "Added 4 days off. Undo" (20, 21).
- The event preview says what changes ("Charlotte's Web (Theo): 0.4 to 0.5 chapters a day ... and 10 more") (23).
- Custom zoom views saved and drew the six weeks in daily detail (26-28).

Confusing:
- The common-subject chips vanish after you add the first one, so the quick start only helps for one subject.
- Add several gives one set of dates for every row. Charlotte Mason books run one after another, so a parent must make a batch per date range. There is no effort or days per row either.
- The Events form opens with no day selected and no hint that one is needed. The preview sits at the very bottom, below the long subject-rules list.
- Days off have no preview of what a day off does to the plan (events do).
- The assignment form's "About how long will that take?" offers 15/30/45/60 min a day with "30" highlighted, then says "That's about 25 min a day now", while the list says "about 20 min a lesson" for the same Math. Two units for one thing (65).
- Where the subject's usual effort lives (collapsed "Usual effort (optional)") is easy to miss; without it, every lesson counts as 30 minutes.

## Each week

"Briefing" is the one or two lines at the top of Plan; there is no other briefing. The timeline carries no sentences, only bars.

**Week 1 (Jan 11-15), checked in Jan 18.** Card "Last week . Jan 11-17" lists every item in plain terms ("Fractions and Decimals, Lessons 1-6", "Little Women, Ch. 1-5"). Clara behind on Math: tap the row, Less, minus: "4 of 6 lessons". Theo as planned. Saved: "Thanks, plan updated". Truthful: week 2 Math became Lessons 5-9 (a thicker bar). Briefing: nothing. Fine (30-35).

**Week 2 (Jan 18-22, MLK Monday), checked in Jan 25.** Clara one chapter behind on Wind in the Willows; Theo ahead on Charlotte's Web. The ahead row reads "4 of 2 ch." (planned 2, did 4), which is nonsense in a parent's words (41). Next week's plan did move forward (Ch. 7-8). Briefing: nothing.

**Week 3 (Jan 25-29).** Sick day for Theo Jan 27-28 under Days off (kind Sick day, only Theo): "Added a day off. Undo". Week adjustment for Clara via Make an adjustment (This week: History 20 to 10 pages, Math 6 to 3, Little Women 5 to 2): all three stored, but the toast says only "Adjusted Little Women for Clara, week of Jan 25." (55). Check-in Feb 1: Clara Math a lesson short, so the first briefing line appeared: "Clara: Fractions and Decimals will finish about 5 weeks late at this pace." That is true to her pace (about 11 lessons in 3 weeks against 15 needed), but the deliberate light week is counted as her pace.

**Week 4 (Feb 1-5).** Mid-term weekday change: Math for Clara to Mon-Thu through Assignments > edit > untick Fri (65, 66). It was stored from the start of that week, so the past is unchanged, but the list row never shows the days and there is no "from when" prompt. Briefing then read "about 7 weeks late" before any new check-in (the forecast got worse because of the change, which the parent is not told). Check-in Feb 8 (Clara Little Women less): still 7 weeks late (70).

**Week 5 (Feb 8-12).** Heavier/Lighter via a bar's More: Lighter on Fractions changed the stored effort 10 to 8 per lesson, and the toast reads "Changed the weight of Fractions ..." (72). Heavier on Proverbs copywork 5 to 6.25. Lighter did not change how many lessons Clara has this week (still 6 lessons in four days), and the briefing still said 7 weeks late. A parent who taps "Lighter" on a late subject gets a thinner bar and the same work. Check-in Feb 15 (Clara Math less, Theo Charlotte's Web more): "4 weeks late".

**Week 6 (Feb 15-19, Presidents' Day Monday).** Reset: "Put Fractions and Decimals back to how you created it? Its dates, effort and days go back, and its week adjustments are removed. You can undo this right after." Reset set effort back to the subject's, and Undo restored it exactly (90, 91). Good. Undo of a three-item week adjustment reverted only one of the three rows (see Findings). Check-in Feb 22 with Looks right: "Thanks!"; briefing unchanged at 4 weeks late.

**Week 7 (Feb 22-28, the Sabbath week), opened Feb 22.** Plan shows only the 4-weeks-late line and two "Make an adjustment" buttons, with nothing saying it is a break week (101). The timeline shows the hatched week correctly.

Verdict on truth: the check-in cards and the timeline bars told the truth every week. The briefing's lateness lines were consistent with the check-ins but gave no way to act, and Plan never said what the week holds.

## What broke

| # | Severity | Finding | Steps |
|---|---|---|---|
| 1 | High | Undo of a multi-row week adjustment reverts only one row and leaves the rest changed, silently. The toast also names only one assignment. | Plan > Make an adjustment for a child > change 3 items > Save > tap Undo in the toast. Overrides for the week went 3 rows to 2 (92, 93; confirmed in `week_override`). |
| 2 | High | Plan has no "what this week holds": with no check-in due it is two buttons and a blank page, including on a Sabbath/break week and the first week. A parent cannot see what to do today without opening a sheet of +/- steppers or the timeline. | Open Plan on any week (24b, 101). |
| 3 | Medium | A behind child has no way to say "let it finish later" in the check-in (only As planned / Less / More), so the plan thickens bars to keep the end date. The only signal is the briefing line, which offers no next step. | Check in Clara's Math as Less three weeks running (70, 80). |
| 4 | Medium | "Lighter"/"Heavier" change effort per lesson, not how much there is to do, and show no size. Lighter on a late subject left 6 lessons in 4 days and the lateness line unchanged. The toast says "Changed the weight of ...", an engine word. | Timeline > bar > More > Lighter (72, 73). |
| 5 | Medium | "4 of 2 ch." when ahead; the count reads wrongly when the amount exceeds the plan. | Check-in > row > More > one more (41). |
| 6 | Medium | Briefing "finish N weeks late" moved from 5 to 7 weeks after a weekday change with no check-in, and counts a deliberate light week as pace; the parent is not told why. | Weeks 3 and 4 above. |
| 7 | Medium | Add several (and CSV) allow only one date range and no days or effort per row; sequential books need many batches. | Setup. |
| 8 | Low | The effort question on the assignment form uses minutes a day ("30 min a day" highlighted, "about 25 now") while subjects and lists say minutes a lesson. | 65. |
| 9 | Low | Common-subject chips disappear after the first is added. | Subjects page, new family. |
| 10 | Low | "Last week isn't checked in yet." link repeats the card heading directly below it. | 70-before. |
| 11 | Low | Events form has no default day and its preview is below the fold; Days off has no preview. | 23, 50. |
| 12 | Low | Assignment list rows do not show their days (Mon-Thu) or any week adjustments. Check-in items and adjustment-sheet rows use different orders (by assignment vs alphabetical). | 66. |
| 13 | Low | One control under 44 px on every screen at 390 px (not identified); the bottom tab bar's "Schedule" label touches the screen edge. | measured; 09. |

## Screen tests

Pass, Partial or Fail for the six tests in DESIGN_DIRECTION.md. Look and feel is the pre-redesign style (dark-navy header, boxed forms, no Home) and not judged beyond that.

| Screen | Five seconds | One job | No duplicates | Parent's words | Empty state | Phone first |
|---|---|---|---|---|---|---|
| Plan (This week) | Fail: blank page, no week content | Partial: check-in, briefing and adjustment compete | Partial: nudge link plus card heading | Partial: lateness line good; "N of M" wrong when ahead | Fail: empty with no guidance | Pass |
| Check-in card | Pass | Pass | Pass | Pass | n/a | Pass |
| Timeline | Partial: dense lanes, many repeated lane names | Partial | Partial: Year, This month and custom views plus child chips | Partial: toast says "weight" | Pass: "Nothing planned yet." | Partial: must scroll inside a long page; bars small |
| Edit bar / More | Partial: Heavier/Lighter size unknown | Pass | Pass | Fail: "weight" | n/a | Pass |
| Kids | Pass | Pass | Pass | Pass | Pass | Pass |
| Subjects | Pass | Pass | Pass | Pass | Partial: chips vanish | Pass |
| Schedule hub | Pass | Pass | Pass | Pass | Pass | Pass |
| Assignments (+ Add several, CSV, Copy) | Partial: four add paths plus two copy panels in a row | Partial | Partial: Add / Add several / CSV overlap by design | Partial: minutes a day vs a lesson | Pass | Pass |
| Days off / templates | Pass | Pass | Pass | Pass | Pass | Pass |
| Events | Partial | Pass | Pass | Pass | Partial: no default day | Partial: preview below fold |
| Family settings | Pass | Pass | Pass | Pass | n/a | Pass: 400-entry time-zone list is long |

## Verdict

Not yet without help. A co-op friend can set up kids, subjects, calendar and events alone: those screens are clear and the template, CSV and event preview are good. Weekly check-ins are the best part and were truthful all six weeks. But steering is where they would stall: Plan says nothing about what the week holds (even on a break week), "Lighter" does not make a late week lighter, a behind child can only be cured by finding the end date on the timeline, and Undo can leave an adjustment half-applied. Fix findings 1 to 4 and a friend could run a term unaided.
