# S2a-06 — Add the update-assignment endpoint

**Depends on:** S2a-05  
**Size:** S

## Goal
`PATCH /api/assignments/:id` changes any field of an assignment, replaces its children, or archives/unarchives it.

## Context
Partial body with the create fields (all optional; `minutesPerUnit: null` clears the override) plus `archived: boolean`. Date rules are checked on the merged result.

## Steps
1. Load the row for the family (404 if missing/foreign/malformed id).
2. Validate merged start/end; check references like create.
3. Update columns, and if `childIds` is sent replace `assignment_child` rows, all in one transaction.
4. Return the list shape.

## Done when
- [x] Archiving an assignment removes it from `/api/plan`; unarchiving brings it back.

## Tests
- each field alone → 200
- childIds replaced (not appended)
- minutesPerUnit null clears
- endDate before existing start → 400
- foreign/malformed id → 404
- archive/unarchive round-trip
- empty body → 400

## Out of scope
- Deleting assignments (logs reference them).
