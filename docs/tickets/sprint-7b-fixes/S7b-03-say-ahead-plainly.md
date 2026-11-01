# S7b-03 — Say "ahead" plainly in the check-in

**Finding:** CM run #5: an ahead row reads "4 of 2 ch."  
**Depends on:** none  
**Size:** XS

## Goal
A check-in row that went beyond the plan reads plainly, for example "4 chapters (2 more than planned)".

## Steps
1. In the check-in row text (`features/checkin/checkinText.ts` or `amount.ts`), when done > planned show "{done} {units} ({extra} more than planned)"; behind stays "{done} of {planned} {units}"; finishing reads "Finished".

## Done when
- Ahead, behind, on plan and finished rows each read plainly; no "4 of 2".

## Tests
- Unit: the four cases for pages, chapters, lessons and minutes.

## Out of scope
- The Sprint 8 check-in redesign (it reuses this text).
