# S7b-07 — Small fixes from the Sprint 7 tester

**Findings:** `reviews/sprint-7-verification.md` F1, F3, F4, F5, F7 (all Low). F2 (zoom row order) is decided as built by Will; F6 is an accepted observation.  
**Depends on:** none  
**Size:** S

## Goal
Clear the Sprint 7 tester's small findings in one pass.

## Steps
1. **F1:** the Fall, Spring and This month switches in the Zoom views sheet are full 44 px rows (label and switch one target).
2. **F3:** a custom view with no overlap with the plan shows "Nothing planned in {name} yet." over the grid instead of silently looking like Year. Built-ins the grid can't offer (Fall or Spring on a grid without that half) say "Not in this year's dates" in the sheet instead of a plain switch.
3. **F4:** minutes-based subjects say "about 30 min a day" (not "1 min a minute") on subject screens and the assignment hint.
4. **F5:** the tap-target script also opens Copy to a new year, Copy to another child and the Zoom views sheet.
5. **F7:** an empty This month (nothing planned that month) shows "Nothing planned this month." under the axis.

## Done when
- Each finding's reproduction from the tester's report no longer reproduces.

## Tests
- Web tests for 2, 3 and 5; the script run for 4; size checked in the tester pass for 1.

## Out of scope
- Redesign (Sprint 8).
