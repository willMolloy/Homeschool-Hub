# S1-29 — Add the create-subject endpoint

**Depends on:** S1-28  
**Size:** XS

## Goal
`POST /api/subjects` creates a subject for the signed-in family and returns it with status 201.

## Context
Body: `{ name: string, color?: string }`. `family_id` comes from the session. Subject names are unique per family, case-insensitive (DB index `subject_family_name_uq`).

## Steps
1. Validate the body: name is trimmed, 1–60 chars; color optional, `#RRGGBB`.
2. `sort_order` = current max + 1 for this family (so new subjects appear last).
3. Insert via `subjectRepo.createSubject` and return 201 with the JSON shape from the list endpoint.
4. Unique violation (SQLSTATE 23505) → 409 `{ error: 'duplicate_name' }`.

## Done when
- [ ] Creating a subject shows up in `GET /api/subjects`.

## Tests
- valid → 201 + row in DB with session family_id
- empty / whitespace name → 400
- 61-char name → 400
- bad color → 400
- family_id in the body is ignored
- duplicate name (different case) → 409
- signed out → 401

## Out of scope
- Bulk import.
