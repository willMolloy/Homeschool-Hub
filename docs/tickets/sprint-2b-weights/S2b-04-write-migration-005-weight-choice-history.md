# S2b-04 — Write migration 005: weight_choice history

**Depends on:** S2b-03  
**Size:** S

## Goal
An append-only `weight_choice` table records every weight a parent sets for a child and unit type, so a new assignment can start from that child's usual weight.

## Context: why a table, not a query over `assignment` (decision D4)
- **History:** an assignment row only holds its *current* weight. "The last 5 weights this parent chose for Margaret's pages" needs past choices too, including ones later edited.
- **Edit time:** `assignment.updated_at` changes on any edit (title, dates, archive), so it can't order *weight* edits.
- **Multi-child:** one shared assignment has one weight but teaches every child on it. One row per child keeps the read a single index scan on `(child_id, unit_type, chosen_at DESC)`.
- **Unit changes:** a choice stays filed under the unit type it was made for, even if the assignment later switches unit.
- **Cost:** one more INSERT inside the save transaction (S2b-07), which the RF-11 `Tx` type enforces.
- A derived query was the alternative. It needs no new write path, but it loses edit history and can't tell weight edits from other edits.

## Steps
1. `db/005_weight_choice.sql`:
   ```sql
   CREATE TABLE weight_choice (
     id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     family_id      uuid NOT NULL,
     child_id       uuid NOT NULL,
     assignment_id  uuid NOT NULL,
     unit_type      text NOT NULL CHECK (unit_type IN ('pages', 'chapters', 'lessons')),
     weight         numeric(6,2) CHECK (weight IS NULL OR (weight >= 0.01 AND weight <= 100)), -- NULL = parent cleared it back to the default
     chosen_at      timestamptz NOT NULL DEFAULT now(),
     FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE,
     FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE
   );
   CREATE INDEX weight_choice_child_unit_idx ON weight_choice (child_id, unit_type, chosen_at DESC, id DESC);
   ```
2. Backfill one row per (assignment, child) where `weight_per_unit IS NOT NULL`, with `chosen_at = assignment.updated_at`. Existing parents' converted weights count as their history.
3. Record `'005_weight_choice'` in `schema_migration`, and add a line to the db README.
4. `db/test/enums.test.ts` (RF-08): add `weight_choice.unit_type`, compared with `UNIT_TYPES` minus `minutes`.

## Done when
- [ ] The table, index and backfill exist, and `db:validate` has a section for them: a weight out of range → 23514, a foreign child → 23503, a minutes unit → 23514.

## Tests (`db/test/weight-choice-migration.test.ts`, scratch DB)
- A two-child shared assignment with a weight gives 2 backfilled rows; one with a NULL weight gives none.
- Deleting the family cascades.

## Out of scope
- Writing choices from the API (S2b-07) and reading the usual weight (S2b-08).
