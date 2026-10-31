# S7-10 — A very slow pace still gets a briefing line

**Finding:** Sprint 4b L6  
**Depends on:** none  
**Size:** XS

## Goal
When progress is so slow that `forecastFinish` gives up (past its 730-day limit), the briefing still says "{title} won't finish this school year at this pace."

## Steps
1. Distinguish "gave up because too slow" from "on pace / not enough check-ins": return a marker (e.g. `{ beyondLimit: true }`) from the engine helper, or detect the case in `briefingLines` from the same inputs. Record the choice.

## Done when
- The tester's case (100 pages, check-ins 44.4 then 44.6) shows the plain line.

## Tests
- Engine or web unit test for the case; on-pace and single-check-in cases still show nothing.

## Out of scope
- Changing the 730-day limit.
