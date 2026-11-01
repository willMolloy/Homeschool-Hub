# S6-03 — Adjust this or a coming week on This Week

**Source:** ROADMAP.md, "Adjust the current or a coming week"; spec "This Week tab", item 3  
**Depends on:** S6-02  
**Size:** M

## Goal
On This Week, for the current or a coming week, a parent changes how much of an assignment a child does that week, then chooses to keep the end date or push it back.

## Context
- This Week (`PlanPage`) shows each child's week; finished weeks already have "Make an adjustment" through the check-in (T-03b), which reuses `ProgressAdjuster` and `AbsorbChoice` (`features/checkin/`).

## Steps
1. For the current or a coming shown week, each child's "Make an adjustment" opens the same sheet with each assignment's planned amount for the week as a starting value.
2. Changing an amount asks the same question as the check-in: keep the end date (the rest of the weeks get a little more or less) or push the end date back (or bring it in). Default: keep the end date.
3. Save sends one `PUT /api/week-overrides` per changed row; setting a row back to the plan's amount removes its adjustment. The plan refreshes.

## Done when
- Changing this week's math from 4 to 1 lessons with keep end date thickens later weeks and leaves the end date; with push, the end date moves later.
- Past weeks keep the check-in flow unchanged.
- Only what's essential; 360 px; 44 px targets.

## Tests
- Web (fake API): opening on the current week prefills planned amounts; a change sends the right PUT; back to plan sends DELETE; a past week still uses the check-in; the plan reloads.

## Out of scope
- Adjusting from the timeline.
