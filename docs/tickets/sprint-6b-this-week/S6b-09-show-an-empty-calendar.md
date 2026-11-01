# S6b-09 — Show an empty calendar when nothing is planned

**Source:** Will's review (2026-10-31): "the schedule doesn't render unless we add assignments. It should be an empty calendar."  
**Depends on:** none  
**Size:** S

## Goal
With no assignments, the timeline still draws the calendar (months, today line, days off and events) so a new family sees where their year will go.

## Context
- `TimelinePage` shows only "Nothing planned yet." when `model.lanes` is empty.

## Steps
1. Build the layout with zero lanes: the month axis over the family's range (if there are no assignments, from the start of the current month through the next 10 months), the today line, breaks, and event strips if any.
2. Under the axis, one quiet line: "Nothing planned yet." with the "+ Add assignment" button, which stays in the header as usual.
3. Zoom presets work on the empty calendar.

## Done when
- A new family's Timeline shows an empty calendar with months and today, and Add assignment works from it; the first assignment appears in place.

## Tests
- Layout: zero lanes produce an axis and today line; Web: empty state renders the calendar and the add button; adding an assignment replaces the empty line with its lane.

## Out of scope
- Sample data.
