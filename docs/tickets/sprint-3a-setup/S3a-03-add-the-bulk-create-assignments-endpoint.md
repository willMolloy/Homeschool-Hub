# S3a-03 — Add the bulk-create assignments endpoint

**Source:** ROADMAP.md, "Fast setup" (bulk-add and CSV import both need it)  
**Depends on:** none  
**Size:** S

## Goal
`POST /api/assignments/bulk` creates up to 50 assignments in one all-or-nothing transaction.

## Context
- `routes/assignments.ts` has `CreateBody` and a create handler that runs `checkRefs`, `createAssignment` and `recordWeightChoices` in `withTransaction`.
- Every route rejects unknown body fields (RF-09), and ownership always comes from the session.

## Steps
1. Move the body of the single create into one function (for example `createOne(c, familyId, body)`) so the single and bulk routes share it. The single route's behaviour must not change.
2. Add `POST /api/assignments/bulk` with body `{ assignments: CreateBody[] }`, 1 to 50 items, strict.
3. Validate every item first (shape, date order, limits). If any item fails, return 400 with the usual error shape, and the message names the item by its position (1-based), e.g. "Assignment 3: …". Nothing is created.
4. Then, in **one** transaction, check references for all items and create them in order. Any failure rolls back everything.
5. Return 201 with the created assignments in request order (the same JSON as the single create).

## Done when
- Valid input creates every item; invalid input creates none.
- Weight choices are recorded exactly as a single create would record them.
- Another family's subject or child id fails the whole request with the single route's error.
- 0 items or more than 50 is a 400.

## Tests
- API integration (`apps/api/test/assignments-bulk.test.ts`): 3 valid items → 201, 3 rows in order; one bad item → 400 naming its position and 0 rows created; a foreign child id → error and 0 rows; 51 items → 400; an unknown field → 400; signed out → 401; a weight choice is recorded for an item with a weight.
- The existing single-create tests still pass unchanged.

## Out of scope
- Bulk update or bulk archive.
