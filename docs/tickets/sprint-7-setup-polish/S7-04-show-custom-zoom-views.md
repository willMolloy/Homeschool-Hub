# S7-04 — Show custom and hidden zoom views on the timeline

**Source:** Will, 2026-10-31  
**Depends on:** S7-03  
**Size:** S

## Goal
The timeline's zoom row shows Year, the built-in views the family hasn't hidden, then its own views, and each custom view zooms to its dates.

## Context
- `features/timeline/zoom.ts` (`ZOOMS`, `zoomRange`) and `ZoomPresets.tsx`.

## Steps
1. Extend the zoom choice to custom views by id; `zoomRange` for a custom view is its start..end clamped to the grid (whole grid if no overlap, like Fall and Spring today).
2. Hidden built-ins aren't shown; a remembered zoom that is now hidden or deleted falls back to Year.
3. The row scrolls sideways on phones when it doesn't fit.

## Done when
- A family with "Term 1: Aug 17 – Nov 6" and Fall hidden sees Year, Spring, This month, Term 1; tapping Term 1 shows those dates.

## Tests
- Unit (`zoomRange`): custom, clamped, outside the grid. Web: the row order, hidden built-ins, fallback to Year.

## Out of scope
- Editing (S7-05).
