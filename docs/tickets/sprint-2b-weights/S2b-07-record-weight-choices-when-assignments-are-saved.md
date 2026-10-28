# S2b-07 — Record weight choices when assignments are saved

**Depends on:** S2b-04, S2b-06  
**Size:** S

## Goal
Each explicit weight a parent saves on a **pages or chapters** assignment is appended to `weight_choice` for every child on it, in the same transaction as the save.

## Rules (D5, D17)
- Only `isLearnedUnit(unitType)` (pages, chapters). Lessons and minutes never write rows.
- **Create** with a non-null weight → one row per child.
- **Create** with null → no rows (taking the default isn't a choice).
- **PATCH** where the resulting weight differs from the stored one (including a change to null) → one row per child on the assignment *after* the patch, under the resulting unit type.
- **PATCH** that adds a child without changing the weight → no rows (D9).
- Archive, unarchive, and title or date edits → no rows.
- A weight pre-filled from the child's history (S2b-11) is sent explicitly, so it counts as a choice (D5). That keeps the usual weight stable, and old values age out of the last 5.
- The legacy `minutesPerUnit` alias writes no rows.

## Steps
1. `repos/weightChoiceRepo.ts`: `recordWeightChoices(tx: Tx, { familyId, assignmentId, childIds, unitType, weight })`, a single `INSERT … SELECT unnest(...)`. It requires a `Tx` (RF-11) and returns early for units that aren't learned.
2. Call it from the create and update routes inside their `withTransaction`.

## Tests (`apps/api/test/weight-choice-write.test.ts`)
- **Create:**
  - A two-child pages create with weight 2 → 2 rows.
  - A chapters create → rows.
  - A lessons create with weight 15 → 0 rows; a minutes create with weight 1 → 0 rows.
  - No weight → 0 rows.
- **PATCH:**
  - Weight 2 → 3 → 1 row per child.
  - The same weight resent → 0 rows.
  - A change to null → NULL rows.
  - pages → lessons with a weight → 0 rows.
  - lessons → pages with a weight → pages rows.
  - Adding a child only → 0 rows; archive → 0 rows.
- A failed save (400, or an FK error) → 0 rows.
