# S2b-29 — Update docs for assumed progress and check-ins

**Depends on:** S2b-28  
**Size:** XS

## Goal
The docs explain the new model: the plan assumes work was done, check-ins correct it, and logs are only for hours and exports.

## Steps
1. `docs/REVIEW-GUIDE.md`:
   - A "Progress" section covering: no rollover; check-ins and the two absorb modes; skip = done; the API routes.
   - Remove the 135-vs-90 caveat.
2. `docs/progress/overnight.md`: mark S1-35's deviation note as superseded by S2b-18.
3. `db/README.md`: 007 and the "log tables feed hours and exports only" note.
