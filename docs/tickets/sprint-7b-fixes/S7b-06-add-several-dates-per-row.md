# S7b-06 — Add several: optional dates per row

**Finding:** CM run #7: Add several takes one date range, so books read one after another need many batches.  
**Depends on:** none  
**Size:** S

## Goal
In Add several, a parent can give a row its own start and end (defaulting to the shared dates), so a term's books in sequence go in one batch.

## Steps
1. Each row gets a small "Dates" toggle that reveals its own Start and End, prefilled from the shared dates; untouched rows use the shared ones.
2. Validation per row as today; one bulk save.
3. Confirm CSV import already takes per-row `start` and `end` (S3a-05) and say so in its template example (two books in sequence).

## Done when
- Three Literature books in sequence (Sep–Oct, Nov–Dec, Jan–Feb) go in with one Save.

## Tests
- Web: per-row dates sent; untouched rows use shared dates; a row's bad dates show on that row.

## Out of scope
- Per-row effort or days.
