# S2b-07 — Record weight choices when assignments are saved

**Depends on:** S2b-04, S2b-06  
**Size:** S

## Goal
Each explicit weight a parent saves is appended to `weight_choice` for every child on the assignment, in the same transaction as the save.

## Rules (decision D5)
- **Create** with a non-null `weightPerUnit` → one row per child in `childIds`, with the unit type and weight.
- **Create** with null or no weight → no rows. Leaving the default is not a choice.
- **PATCH** where the resulting weight differs from the stored weight (including a change to null, a "cleared" row) → one row per child on the assignment *after* the patch, under the resulting unit type.
- **PATCH** that adds a child without changing the weight → no rows (adding Frank to Maggie's book doesn't teach anything about Frank).
- Archiving or unarchiving, and changes to title or dates, → no rows.
- A weight accepted from a suggestion (S2b-11) is sent explicitly by the web, so it **does** count as a choice. That keeps the usual weight stable, and old edits age out.
- Minutes assignments never write rows.
- The legacy `minutesPerUnit` alias (S2b-06) doesn't write rows. It only exists until S2b-13.

## Steps
1. New `repos/weightChoiceRepo.ts`: `recordWeightChoices(tx: Tx, { familyId, assignmentId, childIds, unitType, weight })`. A single `INSERT … SELECT unnest($childIds)`. It requires a `Tx` (RF-11).
2. Call it from the create and update routes inside their existing `withTransaction`, after the assignment write.

## Done when
- [ ] Each rule above has a test, and nothing is written outside the save transaction (a failed save leaves no choice rows).

## Tests (`apps/api/test/weight-choice-write.test.ts`)
- **Create:**
  - A two-child create with weight 2 → 2 rows.
  - A create with no weight → 0 rows.
  - A minutes create → 0 rows.
- **PATCH:**
  - Changing the weight 2 → 3 → 1 row per child.
  - The same weight resent → 0 rows.
  - A change to null → rows with a NULL weight.
  - A unit change with a new weight → rows under the new unit.
  - Adding a child without a weight change → 0 rows.
  - Archive → 0 rows.
- A save that fails validation (400) or hits an FK error → 0 rows.

## Out of scope
- Reading the usual weight (S2b-08).
