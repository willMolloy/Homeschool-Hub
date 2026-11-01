# S6b-03 — Check in last week with Completed or Update status

**Source:** Will's review (2026-10-31): "a check on them that says 'completed' or 'update status'. Update status can have a small box pop up that allows the user to say whether they got ahead or behind and how they want to handle that."  
**Depends on:** S6b-02  
**Size:** M

## Goal
Last week's check-in is the same pastel bars, each marked **Completed** with one tap or changed through a small **Update status** pop-up.

## Context
- Today's card (`LastWeekCard`, `CheckInRow`, T-09) opens As planned / Less / More with an inline stepper per row and saves differences with keepEndDate (the end-date choice was removed in T-09).
- The check-in API (`PUT /api/check-ins/:weekStart`) takes positions and a `mode` (keepEndDate or pushEndDate) per changed row; a row that reaches the total sends `mode: null`.

## Steps
1. Last week shows "Last week · Oct 19–23" with one pastel bar per planned assignment (same look as S6b-02), each with two controls: a **Completed** check and **Update status**.
2. **Everything was completed** at the top confirms the whole week in one tap (as "Looks right" does today).
3. **Update status** opens a small pop-up (`ResponsiveSheet`, bottom on phones) for that assignment:
   - "Got ahead" or "Fell behind";
   - "Got to {page/lesson/chapter} ___" (prefilled with the planned end, limited to the week's start and the total; reaching the total reads "Finished it");
   - "Keep the end date" (default) or "Move the end date";
   - Done closes the pop-up and marks the bar ("Got to p. 140 · end date kept").
4. **Save** sends the week once: completed rows as planned, updated rows with their position and mode. "Add progress on something else" (S2c-06) stays as a quiet link at the bottom.
5. The per-child "Make an adjustment" sheet for a past week uses the same bars and pop-up.
6. Remove the inline As planned / Less / More chips and stepper.

## Done when
- One tap on "Everything was completed" checks in the whole week.
- Updating one bar to "Fell behind, got to p. 130, move the end date" saves that position with pushEndDate, and the plan's end date moves later.
- 360 px; 44 px; no chips, sliders or steppers inline.

## Tests
- Web: everything completed sends the as-planned save; Update status pop-up flows for ahead and behind with each mode; the bar shows the change; finishing reads "Finished it" and sends mode null; Add progress still works; past-week sheet uses the same controls. Update or replace the T-09 row tests and say which.

## Out of scope
- Checking in the current week mid-week.
