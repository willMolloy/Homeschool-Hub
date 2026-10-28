# S1-24 — Add the update-child endpoint

**Depends on:** S1-23  
**Size:** XS

## Goal
`PATCH /api/children/:id` changes a child's name, color, sort order, or archived state, but only for the signed-in family's rows.

## Context
Archive instead of delete. Childs are referenced by assignments, logs and events, and history must survive. `archived: true` sets `archived_at = now()`; `false` clears it.

## Steps
1. Body: any of `{ name?, color?, sortOrder?, archived? }` (at least one). Same validation as create.
2. SQL: `UPDATE child SET ... , updated_at = now() WHERE id = $1 AND family_id = $2 RETURNING *`.
3. No row returned → 404 `{ error: 'not_found' }` (also for another family's id, so ids can't be probed).
4. Invalid uuid in the URL → 404 (not 500).

## Done when
- [ ] Rename and archive both work from curl.

## Tests
- rename → 200 + new name
- archive → disappears from default list
- unarchive → reappears
- another family's id → 404
- malformed id → 404
- empty body → 400

## Out of scope
- Hard delete.
- Drag-to-reorder UI.
