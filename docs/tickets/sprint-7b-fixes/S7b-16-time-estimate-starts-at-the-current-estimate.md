# S7b-16 — Update time estimate starts at the current estimate

**Finding:** S7b tester N2 (Medium): the sheet preselects "15 min a day" while saying "about 30 min a day"; saving untouched halves the estimate.  
**Depends on:** none  
**Size:** XS

## Goal
Opening the sheet and saving without a change changes nothing.

## Steps
1. Preselect the preset that matches the current minutes a day; if none matches, preselect Custom filled with the current minutes (rounded to the nearest 5).
2. Save is disabled until the choice differs from the current estimate.

## Done when
- An assignment at about 30 min a day opens with 30 selected; one at 37 opens on Custom 35. Save is off until changed.

## Tests
- Web: preselection for a preset value and a custom value; Save disabled when unchanged.

## Out of scope
- How the next suggestion is learned (tester N9).
