# S1-27 — Add the edit-child form

**Depends on:** S1-24, S1-26  
**Size:** S

## Goal
Tapping a child on `/kids` lets the parent rename it, recolor it, or archive/unarchive it.

## Context
Uses `PATCH /api/children/:id`. Archive needs a confirm step that explains history is kept: 'Archive {name}? Past work and history stay; it is hidden from planning and lists.'

## Steps
1. Tap a row → the same inline form as Add, pre-filled, plus an 'Archive' (or 'Unarchive') button.
2. Save → `apiPatch`, update the row in place.
3. Archive → confirm dialog (native `<dialog>`), then PATCH `{archived:true}`; the row disappears unless 'Show archived' is on.

## Done when
- [ ] Rename, recolor, archive, unarchive all work and survive a reload.

## Tests
- render tests: rename updates row; archive asks for confirmation then hides the row; cancel leaves it

## Out of scope
- Reordering.
- Hard delete.
