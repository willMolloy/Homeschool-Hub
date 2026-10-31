# S6-07 — Reset an assignment to how it was created

**Source:** decision C2 ("reset an assignment to how it was created")  
**Depends on:** S6-05  
**Size:** S

## Goal
`POST /api/assignments/:id/reset` puts an assignment back to its original values and removes its week adjustments.

## Steps
1. Restore every field in `original`, delete the assignment's week adjustments, and record an undo entry for the reset (S6-06, once built; until then skip recording).
2. Check-ins stay (they record what actually happened).
3. If an original subject or child is now archived, keep the current one for that field and say so in the response (`kept: ["subject"]`).

## Done when
- A dragged, re-weighted and adjusted assignment returns to its created dates, weight and plan.

## Tests
- API integration: reset after edits; adjustments removed; check-ins kept; an archived original subject is kept as current and reported; another family's id → 404.

## Out of scope
- Resetting several assignments at once.
