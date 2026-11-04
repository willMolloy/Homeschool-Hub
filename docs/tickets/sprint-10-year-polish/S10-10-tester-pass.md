# S10-10 — Tester pass
**Source:** HOW_WE_WORK · **Depends on:** every other Sprint 10 ticket · **Size:** S

## Goal
An independent tester checks Sprint 10 against the mockup and DeeDee's 2026-11-03 decisions, and reports in `docs/reviews/sprint-10-verification.md`.

## Context
- The mockup is `docs/design/mockups/year-polish*.png`. Where DeeDee's 2026-11-03 decisions differ from it, they win:
  - dynamic bar heights instead of the 20 px cap;
  - a rail instead of a sidebar;
  - 12 colours.
- The Sprint 8 and Sprint 9 tap-target checks flagged the 11 Year badges at 24 px wide. That finding must be closed here.

## Steps
1. Compare at 320, 360, 390, 600, 800, 840 and 1280 px, in light and dark.
2. Check tap targets everywhere, with nothing under 44 px. Name these explicitly:
   - **the Year badges (the 24 px finding from Sprint 8 N8 / Sprint 9: confirm it is closed)**;
   - thin bars;
   - the week arrows;
   - both Set up back links;
   - the swatch row;
   - the archived switch;
   - the rail items.
3. Bar heights (S10-04):
   - none outside `BAR_H_MIN`–`BAR_H_MAX`;
   - the heaviest bar in the view draws at the maximum, for one child and for All children;
   - heavier and lighter weeks differ visibly at Year, term and month;
   - include screenshots for DeeDee's look.
4. Together (S10-02): "History spine" shows once with "F M", and the ribbons still count it.
5. Colours (S10-11, S10-12):
   - every demo subject has its own colour, with Art coral;
   - all 12 slots meet AA in both themes;
   - changing a colour shows on the Year view.
6. Navigation and layout (S10-09, S10-13, S10-14, S10-16 to S10-18):
   - the bar under 600 px and the rail at 600 px and up, never both;
   - Set up is in both and active on its screens;
   - the Week header is one row;
   - the column caps;
   - Home's two panes at 840 px and up;
   - the side panel's open, swap and close behaviour.
7. Run the smoke scenarios and the screen tests.

## Done when
- The report lists each ticket as pass, fail or partial, with steps to reproduce for any failure.
- It states explicitly whether the 24 px badge finding is closed.
- Only what's essential: verification, no app changes.

## Tests
- The tester's own scripts, kept beside the report.

## Out of scope
- Fixing anything. Failures become Sprint 10b tickets.
