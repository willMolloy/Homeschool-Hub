# S6-10 — "Feels heavier / lighter" on the edit bar

**Source:** decision C3  
**Depends on:** S6-09  
**Size:** S

## Goal
With a bar selected, one tap makes it about 25% heavier or lighter, and the correction carries forward to that child's next assignment in the subject.

## Context
- A PATCH with `weightPerUnit` already records a weight choice per child and unit (S2b-07), which feeds the learned suggestion (S2b-08) for the next assignment.

## Steps
1. Add **Heavier** and **Lighter** to the edit bar. Each PATCHes `weightPerUnit` to the current effective weight × 1.25 or × 0.8, rounded and clamped. The bar redraws.
2. The change is undoable (S6-06).

## Done when
- Tapping Heavier twice gives about 1.56× the weight; the next assignment for that child in that subject suggests the corrected weight.

## Tests
- Web: the PATCH values; clamping at the limits; the controls only show with a bar selected. API: the next suggestion reflects the nudge.

## Out of scope
- A nudge per day or week.
