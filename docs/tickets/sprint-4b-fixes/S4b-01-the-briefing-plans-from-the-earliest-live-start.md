# S4b-01 — The briefing plans from the earliest live start

**Finding:** M1  
**Depends on:** none  
**Size:** S

## Goal
One very long assignment can no longer hide every "will finish late" line.

## Context
- The briefing makes its own `/api/plan` request over the live assignments' span, held to the API's 400-day limit (S4-09 decision). When the span is longer, it currently moves the *start* to the shown week, so `forecastFinish` loses the check-in history and returns null for every assignment.

## Steps
1. When the span is over 400 days, keep the earliest live start and cut the *far end* (start + 399 days), while still including the shown week. If the shown week is more than 399 days after the earliest start, request two ranges (earliest start + 399 days, and one ending at the shown week's end) and merge the plans per assignment and child.
2. Only an assignment that runs past the requested end may lose its forecast; record that in the progress doc.

## Done when
- With one 500-day assignment and a behind-pace 3-month assignment, the late line for the short one appears.

## Tests
- Web: the case above (fake API asserts the requested `from`/`to`); the two-range case merges correctly; a normal family still makes one request.

## Out of scope
- Raising the API's 400-day limit.
