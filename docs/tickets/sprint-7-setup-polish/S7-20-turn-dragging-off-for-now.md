# S7-20 — Turn bar dragging off for now (code kept behind a switch)

**Source:** Will, 2026-10-31: "Let's drop dragging for now but we may bring it back after demoing. Don't remove the code entirely." No visible handles.  
**Depends on:** none  
**Size:** XS

## Goal
Bars on the timeline can't be dragged, by mouse or touch; dates change through the edit sheet's Start and End. The dragging code stays, behind one switch, so it can return after demos.

## Context
- `useBarDrag` (`features/timeline/useBarDrag.ts`, used in `routes/TimelinePage.tsx`) moves and stretches bars (T-08, T-08b); `drag.ts` holds the pure helpers. On phones, Year zoom is about a pixel a day, too fine for a finger.

## Steps
1. Add one named constant (for example `BAR_DRAG_ENABLED = false` in `features/timeline/drag.ts`, documented with this ticket) and make `TimelinePage` skip attaching the drag handlers when it is false. Tapping a bar still selects it and opens the edit sheet; scrolling over bars is unaffected.
2. Keep `useBarDrag`, `drag.ts` and their unit tests. Tests that drive a drag through the page run with the switch turned on (pass it as a prop or mock the constant), so the code keeps working for later.
3. Remove any drag hint text or drag cursor shown while the switch is off.

## Done when
- With the switch off, pressing and moving on a bar never changes its dates (mouse or touch) and never blocks scrolling; tapping still selects. Turning the switch on restores dragging with its tests passing.

## Tests
- Web: with the switch off, a pointer drag sends no PATCH and the bar is selected on tap; with it on, the existing drag tests pass. Say which tests now set the switch.

## Out of scope
- Removing the drag code.
