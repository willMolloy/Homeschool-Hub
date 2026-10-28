# T-07f — This month shows only what is in the month

**Source:** PO message (2026-10-28): "In This month detail, hide rows with nothing in the visible range." **Depends on:** T-05c, T-07d. **Size:** S.

## Goal

At This month, a row, lane or subject with nothing to draw in the month isn't shown, so the month has no empty lanes (in the demo: Frank's science fair row and Art · Margaret).

## Steps

1. `layoutTimeline`: at the month zoom, pack a child's rows from every assignment as before, then keep only the assignments whose drawn extent overlaps the month. Drop empty rows, then lanes with no rows, then subjects with no lanes.
2. Year, Fall and Spring are unchanged.

## Done when

- [ ] Every month draws exactly the assignments with something in it, and labels only their lanes.
- [ ] A bar keeps its row at This month (rows are not repacked), so nothing jumps when switching zoom.
- [ ] **Only what's essential:** no placeholder for a hidden lane.

## Tests

- `apps/web/test/timeline-month-rows.test.ts`: every month of the sample year, and rows kept across zooms.
