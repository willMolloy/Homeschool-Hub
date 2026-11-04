# S10-10b — Tester pass, Sprint 10b (colours, navigation, the wide layout)
**Source:** HOW_WE_WORK; split from S10-10 on 2026-11-04 (DeeDee) · **Depends on:** every other Sprint 10b ticket, with Sprint 10a merged · **Size:** S

## Goal
An independent tester checks Sprint 10b (S10-09, S10-11 to S10-14, S10-16 to S10-19 and S9b-07) against the mockup and DeeDee's decisions, and reports in `docs/reviews/sprint-10b-verification.md`.

## Context
- The mockup is `docs/design/mockups/year-polish*.png`. Where DeeDee's 2026-11-03 decisions differ from it, they win:
  - a rail instead of a sidebar;
  - 12 colours.
- The Year view itself was checked in S10-10a. Re-check only where 10b touches it (colours, the side panel, the rail beside it).

## Steps
1. Compare at 320, 360, 390, 600, 800, 840 and 1280 px, in light and dark.
2. Check tap targets everywhere, with nothing under 44 px. Name these explicitly:
   - the week arrows;
   - both Set up back links;
   - the swatch row;
   - the archived switch;
   - the rail items;
   - the S9b-07 day chips.
3. Colours (S10-11, S10-12):
   - every demo subject has its own colour, with Art coral;
   - all 12 slots meet AA in both themes;
   - changing a colour shows on the Year view.
4. Navigation and layout (S10-09, S10-13, S10-14, S10-16 to S10-18):
   - the bar under 600 px and the rail at 600 px and up, never both;
   - Set up is in both and active on its screens;
   - Home has no Set up row any more (2026-11-04: one way to do each thing);
   - the Week header is one row;
   - the column caps;
   - Home's two panes at 840 px and up;
   - the side panel's open, swap and close behaviour.
5. S9b-07, a run of days shows which days count:
   - a Mon–Fri family logs Mon–Sun with Saturday ticked and gets 6 school days;
   - a Tue–Sat family's run pre-selects Tue–Sat;
   - Records totals and the CSV follow the chosen days.
6. Run the smoke scenarios and the screen tests.
7. Carry-overs from the 9b re-test (see the README):
   - **R3:** "All children" on one line at 320 px on Records and Schedule, again after S10-16.
   - **S10-19:**
     - the Each entry CSV note (R1);
     - the clipped row (R2);
     - the lowercase sentence (R5);
     - `s2a-13-settings` passing 3 full runs in a row (R7).

## Done when
- The report lists each ticket as pass, fail or partial, with steps to reproduce for any failure.
- It states, for R1, R2, R3, R5 and R7, whether each is closed or still open.
- Only what's essential: verification, no app changes.

## Tests
- The tester's own scripts, kept beside the report.

## Out of scope
- Fixing anything. Failures become follow-up tickets.
- Sprint 10a (S10-10a).
