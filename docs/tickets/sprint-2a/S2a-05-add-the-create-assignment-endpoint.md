# S2a-05 — Add the create-assignment endpoint

**Depends on:** S2a-04  
**Size:** S

## Goal
`POST /api/assignments` creates an assignment for one or more of the family's children.

## Context
Body: `{ subjectId, title, unitType, totalUnits, minutesPerUnit?, startDate, endDate, childIds }`. Child and subject must be this family's and not archived. Insert the assignment and its `assignment_child` rows in one transaction.

## Steps
1. Validate with the S2a-03 pieces; `childIds` 1–20.
2. Check subject and children belong to the session family and are active; otherwise 400 `invalid_reference` (never a 500 from the composite FK).
3. Insert in a transaction; return 201 with the list shape.

## Done when
- [ ] A created assignment appears in `GET /api/assignments` and in `GET /api/plan`.

## Tests
- valid → 201, rows in assignment + assignment_child
- two children → both linked
- missing/unknown/archived/foreign subject or child → 400 invalid_reference
- end before start, span > 1096 days, totalUnits 0 / 1e309 / 100 001 / 1.234, minutesPerUnit 0 / 601, bad unitType, bad date, Feb 30 → 400
- unknown keys (family_id) dropped
- signed out → 401

## Out of scope
- Copying an assignment to another child.
- Templates.
