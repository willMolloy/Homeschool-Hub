# S7b-04 — The finish forecast ignores deliberate changes

**Finding:** CM run #6: the "finish N weeks late" line jumped from 5 to 7 weeks after a weekday change with no new check-in, and it counted a deliberately light week (a week adjustment) as the child's pace.  
**Depends on:** none  
**Size:** S

## Goal
The forecast measures the child's real pace only from weeks that weren't deliberately changed, and a schedule change on its own doesn't move it.

## Steps
1. In `forecastOutcome` (engine `briefing.ts`), leave out of the observed pace any check-in week that has a week adjustment for that assignment (the parent planned it lighter or heavier on purpose).
2. Measure pace per scheduled day of the assignment's own days, so a weekday change rescales consistently; when the days changed mid-assignment (S4-01b), measure from the change onward if at least 2 check-in weeks exist after it, otherwise use the pre-change weeks with the old days.
3. Record the rule in the progress doc and the engine doc comment.

## Done when
- The run's case (a weekday change with no new check-in) leaves the forecast unchanged; a deliberately lightened week doesn't count as falling behind.

## Tests
- Engine: adjusted weeks excluded; a weekday change alone doesn't move the forecast; pace after a change uses the new days; `test:tz`.

## Out of scope
- New briefing lines (S7b-05).
