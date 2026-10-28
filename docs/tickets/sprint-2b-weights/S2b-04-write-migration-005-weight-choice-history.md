# S2b-04 — Write migration 005: weight_choice history

**Depends on:** S2b-03  
**Size:** S

## Goal
An append-only `weight_choice` table records each weight a parent sets for a child on a **pages or chapters** assignment, so a new assignment can start from that child's usual weight.

## Why a table, not a query over `assignment` (D4)
- **History:** an assignment row only holds its *current* weight, but "the child's 5 most recent assignments" needs each assignment's latest weight *and* when it was set.
- **Edit time:** `assignment.updated_at` changes on any edit (title, dates, archive), so it can't order weight edits.
- **Multi-child:** one shared assignment teaches several children. One row per child gives a single index scan per child.
- **Unit changes:** a choice stays under the unit type it was made for if the assignment later switches.
- **Cost:** one INSERT inside the save transaction (S2b-07), which RF-11's `Tx` enforces.

**Only pages and chapters** are learned (D17). For lessons and minutes, history doesn't carry over (one math lesson isn't like another subject's lesson), so the parent sets the bar width on the subject instead (S2b-30…35).

## Steps
1. `db/005_weight_choice.sql`:
   ```sql
   CREATE TABLE weight_choice (
     id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     family_id      uuid NOT NULL,
     child_id       uuid NOT NULL,
     assignment_id  uuid NOT NULL,
     unit_type      text NOT NULL CHECK (unit_type IN ('pages', 'chapters')),
     weight         numeric(6,2) CHECK (weight IS NULL OR (weight >= 0.01 AND weight <= 100)), -- NULL = cleared back to default
     chosen_at      timestamptz NOT NULL DEFAULT now(),
     FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE,
     FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE
   );
   CREATE INDEX weight_choice_child_unit_idx ON weight_choice (child_id, unit_type, chosen_at DESC, id DESC);
   ```
2. Backfill one row per (assignment, child) for pages and chapters assignments with a non-null `weight_per_unit`, using `chosen_at = assignment.updated_at`.
3. Add the `schema_migration` row and a db README line. RF-08 enum test: `weight_choice.unit_type` = `LEARNED_UNIT_TYPES`.

## Done when
- [ ] `db:validate` has a section: weight out of range → 23514; lessons or minutes → 23514; a foreign child → 23503.

## Tests (`db/test/weight-choice-migration.test.ts`, scratch DB)
- A two-child pages assignment with a weight → 2 backfilled rows.
- A lessons assignment with a weight → 0 rows; a NULL weight → 0 rows.
- Deleting the family cascades.

## Out of scope
- Writes (S2b-07) and reads (S2b-08).
