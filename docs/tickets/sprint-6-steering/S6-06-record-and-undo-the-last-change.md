# S6-06 — Record and undo the last change

**Source:** decision C2 ("undo the last change")  
**Depends on:** S6-02, S6-05  
**Size:** M

## Goal
After a plan change, the API can undo that one change.

## Context
- Changes that move the plan and should be undoable: an assignment edit (including a drag, a weight nudge or an archive), a day off created or deleted, a week adjustment set or removed, and a reset (S6-07).

## Steps
1. Each of those writes records, in the same transaction, an undo entry with a short label ("Moved Treasure Island", "Added a day off") and the inverse operation (the previous field values, or the rows to restore or delete).
2. `GET /api/undo` returns `{ label, createdAt }` or null. `POST /api/undo` applies the inverse in one transaction and deletes the entry (undo is one step; there is no redo). If the inverse no longer applies (the assignment was since deleted), return 409 and drop the entry.
3. Other writes (kids, subjects, settings, events) don't touch the undo entry.

## Done when
- Each listed change can be undone exactly, and the undo itself is not undoable.

## Tests
- API integration for each change type: change → undo restores the previous state and plan; a second undo → 404; an unrelated write leaves the entry; a stale entry → 409.

## Out of scope
- More than one step of undo.
