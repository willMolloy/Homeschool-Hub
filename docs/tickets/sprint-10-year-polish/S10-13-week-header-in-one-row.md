# S10-13 — Week arrows and dates in the Week | Year row
**Source:** DeeDee's decision 4 (2026-11-03); UX review improvement 8 · **Depends on:** none · **Size:** S

## Goal
In Schedule · Week, the previous and next arrows and the date range sit in the same header row as the Week | Year switch, and the separate "This week" row is gone.

## Context
- **Decided by DeeDee, 2026-11-03:** fold the "This week" row's arrows and date range into the header row with the Week | Year switch. The arrows keep 44 px tap targets.
- **Checked against the code on 2026-11-03: S9-02 did not do this.** S9-02 retired the check-in card only. Today, in this order:
  - `SchedulePage.tsx` draws the h1, then the Week | Year `Segmented`;
  - `WeekView.tsx` then draws its own row, an h2 ("This week" / "Last week" / "Earlier week" / "Coming week") with the two `round-btn` arrows;
  - then a separate `week-dates` line (aria-live).
- The Year view's own header is S10-08.

## Steps
1. In Week view, render one row: the Week | Year switch at the start and a week group at the end. The week group is ‹, the date range, then ›.
2. Keep the relative word ("This week" and so on) as a small muted label with the range, for example "This week · Oct 26 – Nov 1". Under 360 px, if it does not fit, the word moves to the arrows' accessible names and the live announcement.
3. Keep the arrows as 44 × 44 px buttons named "Previous week" and "Next week". Keep the live region on the range.
4. Remove the old h2 row and the `week-dates` line. Keep a heading for screen readers (a visually hidden h2 with the same title).

## Done when
- At 320, 360 and 1280 px the Week view shows one header row (the switch, the arrows and the range) with no wrapping at 360 px and above.
- The arrows still step weeks and measure 44 px.
- The Year view is unchanged.
- Only what's essential.

## Tests
- Web:
  - one header row in Week view;
  - the arrows step weeks and keep their names;
  - the range is announced;
  - the Year view has no week group.

## Out of scope
- The order of the child switch. "All children" stays first, as already decided.
