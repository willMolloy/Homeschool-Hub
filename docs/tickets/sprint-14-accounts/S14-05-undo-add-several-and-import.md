# S14-05 — Undo for Add several and CSV import
**Size:** S
## Goal
Adding several assignments at once, or importing them from CSV, can be undone in one step, like the copy panels (S7b-11).
## Steps
1. Add several and CSV import send the existing bulk-create `undo: { label, append? }` ("Added 6 assignments", "Imported 24 assignments"); chunks of 50 append to one undo entry.
2. The undo deletes exactly the created assignments and is refused (409, with a plain message) once any has a check-in, a completion answer or log references.
3. The undo bar announces it as for copies.
## Done when
- Adding 6 with Add several and importing a 60-row CSV are each reversed by one Undo.
## Tests
- API: undo for bulk add and import, refusal rules. Web: both panels send `undo`; the undo bar shows.
