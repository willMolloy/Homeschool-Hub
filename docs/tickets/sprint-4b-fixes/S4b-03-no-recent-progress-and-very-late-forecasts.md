# S4b-03 — The briefing reports no recent progress, and caps very late forecasts

**Finding:** M3  
**Depends on:** none  
**Size:** S

## Goal
A child with no progress over two check-in weeks gets a line, and a very slow pace says so plainly instead of "61 weeks late".

## Context
- S4-08 returns null for zero progress and says the caller reports "no recent progress"; S4-09 never added that line.

## Steps
1. If an assignment has at least 2 applied check-in weeks and no progress across them: "No progress on {title} in the last {n} weeks." (coordinator's call)
2. If a forecast is more than 26 weeks late: "{title} won't finish this school year at this pace." (coordinator's call, replaces the week count).
3. Order and the 3-line cap stay as in S4-09; these lines take the "late" slot.

## Done when
- Zero progress over two weeks shows the no-progress line; a 61-week forecast shows the plain wording; a 3-week forecast is unchanged.

## Tests
- Web (`briefingLines`): the three cases; a single check-in still shows nothing.

## Out of scope
- Action buttons on lines.
