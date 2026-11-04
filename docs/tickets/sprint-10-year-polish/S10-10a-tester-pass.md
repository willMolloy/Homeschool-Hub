# S10-10a — Tester pass, Sprint 10a (the Year view)
**Source:** HOW_WE_WORK; split from S10-10 on 2026-11-04 (DeeDee) · **Depends on:** every other Sprint 10a ticket · **Size:** S

## Goal
An independent tester checks Sprint 10a (S10-01 to S10-08, S10-04b, S10-04c and S10-15) against the mockup and DeeDee's decisions, and reports in `docs/reviews/sprint-10a-verification.md`.

## Context
- The mockup is `docs/design/mockups/year-polish*.png`. Where DeeDee's decisions differ from it, they win. For 10a that means dynamic bar heights instead of the 20 px cap, with the maximum at the view's 95th-percentile load (2026-11-04).
- The Sprint 8 and Sprint 9 tap-target checks flagged the 11 Year badges at 24 px wide. That finding must be closed here.
- Navigation, colours and the wide layout are Sprint 10b (S10-10b). Don't fail 10a on them.

## Steps
1. Compare the Year view at 320, 360, 390, 840 and 1280 px, in light and dark.
2. Check the Year view's tap targets, with nothing under 44 px. Name these explicitly:
   - **the Year badges (the 24 px finding from Sprint 8 N8 / Sprint 9: confirm it is closed)**;
   - thin bars (S10-04c);
   - **a badge's zone wins over a bar's zone at the left edge of the plot** (S10-15 against S10-04c): tap just right of a badge, where a bar starts, and the badge is selected, not the bar.
3. Bar heights (S10-04):
   - none outside `BAR_H_MIN`–`BAR_H_MAX`;
   - loads at the view's 95th percentile or above draw at the maximum, for one child and for All children;
   - heavier and lighter weeks differ visibly at Year, term and month;
   - **show the same assignment under All children and under one child, side by side.** Its bars are expected to rescale, because the scale follows the current view;
   - include screenshots for DeeDee's look.
4. Together (S10-02): "History spine" shows once with "F M", and the ribbons still count it.
5. **Make a 3-child family with overlapping books and screenshot its Year view at 390 px.** Report how tall the view gets, whether it scrolls well, and whether the sticky axis and child headers stay readable.
6. The sticky axis and Today (S10-03), the bar labels (S10-04b), breaks (S10-05), the edit sheet (S10-06), Add assignment (S10-07) and the title row (S10-08), each against its ticket's Done when.
7. Run the smoke scenarios and the screen tests.
8. Carry-overs from the 9b re-test (see the README):
   - **R3:** "All children" on one line at 320 px on Schedule;
   - **R4:** the zoom row's scroll cue at 320 px with a 30-character term name;
   - **R6:** the date placeholder has a margin before the icon at 360 px.

## Done when
- The report lists each 10a ticket as pass, fail or partial, with steps to reproduce for any failure.
- It states explicitly whether the 24 px badge finding is closed.
- It states, for R3, R4 and R6, whether each is closed or still open.
- Only what's essential: verification, no app changes.

## Tests
- The tester's own scripts, kept beside the report.

## Out of scope
- Fixing anything. Failures become follow-up tickets.
- Sprint 10b (S10-10b).
