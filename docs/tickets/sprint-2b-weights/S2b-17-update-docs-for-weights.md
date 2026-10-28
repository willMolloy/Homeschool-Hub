# S2b-17 — Update docs for weights

**Depends on:** S2b-16, S2b-37  
**Size:** XS

## Goal
The docs describe weights, learned weights and subject defaults, not minutes.

## Steps
1. `docs/REVIEW-GUIDE.md`:
   - The migrations line covers 004–007.
   - The debug view text says "effort (units × weight)".
   - A "Weights" section covering:
     - The built-ins 1 / 10 / 15 / 0.5, with 2 minutes = 1 point.
     - The bounds.
     - Precedence: assignment → learned (pages and chapters) → subject → built-in.
     - The trimmed-mean rule, with its small-count cases.
     - The multi-child rule.
     - Learned weights are stored on the assignment; a subject default is followed live.
2. `db/README.md`: the expand/contract note for 004–007.
3. Copy the README decisions table, with the dates decided.

## Done when
- [ ] `rg -n "minutes per unit|minutesPerUnit" docs --glob '!tickets/**' --glob '!reviews/**' --glob '!progress/**'` finds nothing.
