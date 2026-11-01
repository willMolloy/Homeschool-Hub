# S6b-01 — Take the effort table off This Week

**Source:** Will's review (2026-10-31): "I don't understand what the table is conveying… Seems useless."  
**Depends on:** none  
**Size:** XS

## Goal
This Week no longer shows the day-by-day effort table; it is only available behind the developer flag.

## Context
- `PlanPage` renders `PlanDebugView` for every week. It shows the engine's internal thickness numbers per day (for example "Math 20.6"), which mean nothing to parents. `useDebugFlag()` is true only in a dev build with `?debug=1`.

## Steps
1. Render `PlanDebugView` only when the debug flag is on. Keep whatever per-child "Make an adjustment" entry it carried, so S6b-02 can replace it.

## Done when
- In a normal build This Week shows no table; with `?debug=1` in dev it still does.

## Tests
- Web: no table by default; the table with the debug flag mocked on. Update existing tests that relied on the table being visible by default, and say why.

## Out of scope
- The new bars (S6b-02).
