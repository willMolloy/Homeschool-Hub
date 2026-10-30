# S3a-02 — Copy an assignment from the timeline edit bar

**Source:** ROADMAP.md, "Fast setup"  
**Depends on:** S3a-01  
**Size:** S

## Goal
With a bar selected on the timeline, a parent can copy its assignment into the timeline's Add assignment sheet, prefilled the same way as S3a-01.

## Context
- `EditBar.tsx` shows the selected bar's controls. `AddAssignment.tsx` opens `AssignmentForm` in a `ResponsiveSheet`.
- After an add, the timeline refreshes, clears the selection and flashes the new bar (`afterAdd.ts`). (Corrected after the S3a-07 tester pass: an earlier version said "selects".)

## Steps
1. Add a **Copy** button to the edit bar.
2. Copy opens the Add assignment sheet with `AssignmentForm` prefilled from the selected assignment, using the prefill from S3a-01.
3. Saving behaves exactly like "+ Add assignment": the sheet closes, the plan refreshes and the new bar flashes.

## Done when
- Copy is in the edit bar only while a bar is selected (progressive disclosure).
- The edit bar still fits on a 360 px wide screen with tap targets of at least 44 px.
- The prefill matches S3a-01 (same function, not a copy of the code).

## Tests
- Web: select a bar, click Copy, and the sheet opens prefilled with the title ending " (copy)"; saving sends one POST and behaves like "+ Add assignment".
- Cancel closes the sheet and leaves the original selected and unchanged.

## Out of scope
- Dragging to copy, or keyboard shortcuts.
