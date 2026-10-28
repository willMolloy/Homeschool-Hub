-- 005_weight_choice (S2b-04): append-only history of the weights a parent sets for a child on a
-- pages or chapters assignment (D4, D17), so a new assignment can start from that child's usual weight.
-- One row per child per save that sets or clears a weight; weight NULL = cleared back to the default.
-- Lessons and minutes aren't learned (D17): their bar width is set on the subject (006).
BEGIN;

CREATE TABLE weight_choice (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  family_id      uuid NOT NULL,
  child_id       uuid NOT NULL,
  assignment_id  uuid NOT NULL,
  unit_type      text NOT NULL CHECK (unit_type IN ('pages', 'chapters')),
  weight         numeric(6,2) CHECK (weight IS NULL OR (weight >= 0.01 AND weight <= 100)),
  chosen_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (child_id, family_id) REFERENCES child (id, family_id) ON DELETE CASCADE,
  FOREIGN KEY (assignment_id, family_id) REFERENCES assignment (id, family_id) ON DELETE CASCADE
);
-- "This child's most recent choices for this unit type": one index scan.
CREATE INDEX weight_choice_child_unit_idx ON weight_choice (child_id, unit_type, chosen_at DESC, id DESC);

-- Backfill: each existing weighted pages/chapters assignment counts as one choice per child,
-- made when the assignment was last updated.
INSERT INTO weight_choice (family_id, child_id, assignment_id, unit_type, weight, chosen_at)
SELECT ac.family_id, ac.child_id, a.id, a.unit_type, a.weight_per_unit, a.updated_at
  FROM assignment a
  JOIN assignment_child ac ON ac.assignment_id = a.id AND ac.family_id = a.family_id
 WHERE a.unit_type IN ('pages', 'chapters') AND a.weight_per_unit IS NOT NULL
 ORDER BY a.updated_at, a.id, ac.child_id;

INSERT INTO schema_migration (version) VALUES ('005_weight_choice');
COMMIT;
