# S2b-17 — Update docs for weights

**Depends on:** S2b-15  
**Size:** XS

## Goal
The docs describe weights, not minutes.

## Steps
1. `docs/REVIEW-GUIDE.md`:
   - The migrations line gains 004–006.
   - The debug view text says "effort (units × weight)".
   - Add a short "Weights" section covering defaults 1/10/15, 3 min = 1 point, the bounds, the usual-weight rule and the multi-child rule, with each one marked as decided by DeeDee or still open.
2. `db/README.md`: the expand/contract note for 004–006.
3. Copy the README's decisions table here, with the date each was decided.

## Done when
- [ ] `rg -n "minutes per unit|minutesPerUnit" docs --glob '!tickets/**' --glob '!reviews/**' --glob '!progress/**'` finds nothing.
