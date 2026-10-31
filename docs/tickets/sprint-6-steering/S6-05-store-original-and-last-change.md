# S6-05 — Store an assignment's original and the last change

**Source:** decision C2  
**Depends on:** none  
**Size:** S

## Goal
The database keeps each assignment's values as created, and one "last change" per family that can be undone.

## Steps
1. Migration (next number): `assignment.original jsonb NULL` holding the created values (title, subject, unit, total, weight, dates, children, weekdays). Fill it for existing assignments from their current values.
2. Table `undo_entry (family_id PRIMARY KEY, label text, inverse jsonb, created_at)`: one row per family, replaced on each recorded change.
3. Creating an assignment (single and bulk) stores `original`.

## Done when
- New and existing assignments have `original`; a family has at most one undo entry.

## Tests
- DB migration test; API: single and bulk create store `original`.

## Out of scope
- Recording or applying undo (S6-06).
