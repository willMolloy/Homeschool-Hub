# S7-08 — Say which days off a saved template left out

**Finding:** Sprint 5 O4  
**Depends on:** none  
**Size:** XS

## Goal
"Save as a template" tells the parent about family-wide days off it leaves out because they start before the year's first day.

## Steps
1. Count those days off and add a line next to the existing per-child note: "1 day off before {first day} isn't included."

## Done when
- A day off starting the day before the chosen first day is reported; one inside the year is saved as before.

## Tests
- Web: the note appears with the right count, and alongside the per-child note.

## Out of scope
- Including days off that span the start.
