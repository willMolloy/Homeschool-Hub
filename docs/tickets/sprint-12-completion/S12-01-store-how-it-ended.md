# S12-01 — Store how an assignment ended
**Size:** S
## Goal
An assignment can record that it was finished or stopped, and on which date.
## Steps
1. Migration: on `assignment`, `ended_as` (`finished` | `stopped`, null while open) and `ended_on` (date). Existing rows stay null.
2. API: set and clear it (PATCH on the assignment, or a small endpoint); validated; undoable through the existing undo ("Marked Treasure Island finished"). Read it in the assignments list and the plan input.
## Done when
- Setting finished or stopped round-trips and can be undone.
## Tests
- API: set, clear, validation, undo; DB migration test.
