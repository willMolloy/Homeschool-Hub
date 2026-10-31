# S4b-07 — "Missed a day?" preselects today

**Finding:** L4  
**Depends on:** none  
**Size:** XS

## Goal
"Missed a day?" takes two taps in the common case: open it, then Save.

## Steps
1. Preselect today when it is an offered day; otherwise the latest offered day of the shown week. Who stays Everyone.

## Done when
- Opening the sheet on a school day shows today selected and Save enabled; on a weekend the latest offered day is selected.

## Tests
- Web: today preselected; a weekend preselects Friday (for a Mon–Fri family); a week with no offered days still says "No days to mark."

## Out of scope
- Marking several days at once.
