# S6b-05 — A simpler timeline edit bar

**Source:** Will's review (2026-10-31): "the 'move a week' or 'end a week early/late' buttons… make it very cluttered. Let's stick with a date picker for beginning and end and a copy button." Will chose to put Heavier, Lighter and Reset behind a small "More".  
**Depends on:** none (after Sprint 6, whose S6-08 and S6-10 add Reset to original and Heavier/Lighter to the edit bar)  
**Size:** S

## Goal
The timeline edit bar shows only Start, End and Copy, with Heavier, Lighter and Reset to original behind one quiet "More".

## Context
- `features/timeline/EditBar.tsx` today has Move back/forward a week, Start and End date pickers, a session Reset after a change, End a week earlier/later, and Copy; Sprint 6 adds Heavier/Lighter and Reset to original. Dragging a bar still moves and stretches it (T-08).

## Steps
1. Remove "Move back a week", "Move forward a week", "End a week earlier" and "End a week later" (and their helpers and styles if unused elsewhere).
2. Keep the Start and End date pickers and Copy in one row.
3. Add a low-emphasis **More** button that opens a small menu with Heavier, Lighter and Reset to original. Drop the separate session "Reset" button if Sprint 6's undo bar and Reset to original cover it; record the call.
4. On phones the bar fits in two rows without sideways scrolling (S5-08's scroll row and S7-09's scroll hint become unnecessary; mark S7-09 as no longer needed in the Sprint 7 README).

## Done when
- The edit bar shows Start, End, Copy and More; More shows Heavier, Lighter and Reset to original; at 360 px nothing scrolls sideways and every control is at least 44 px.

## Tests
- Web: the controls present and absent; More's menu items work as before; dragging still saves. Update the S3a-02, S5-08 and T-08 edit-bar tests that expected the removed buttons, and say which.

## Out of scope
- The assignment form (kept as is).
