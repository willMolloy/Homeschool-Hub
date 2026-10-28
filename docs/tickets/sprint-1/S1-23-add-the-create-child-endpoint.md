# S1-23 — Add the create-child endpoint

**Depends on:** S1-22  
**Size:** XS

## Goal
`POST /api/children` creates a child for the signed-in family and returns it with status 201.

## Context
Body: `{ name: string, color?: string }`. `family_id` comes from the session.

## Steps
1. Validate the body: name is trimmed, 1–60 chars; color optional, `#RRGGBB`.
2. `sort_order` = current max + 1 for this family (so new children appear last).
3. Insert via `childRepo.createChild` and return 201 with the JSON shape from the list endpoint.

## Done when
- [ ] Creating a child shows up in `GET /api/children`.

## Tests
- valid → 201 + row in DB with session family_id
- empty / whitespace name → 400
- 61-char name → 400
- bad color → 400
- family_id in the body is ignored
- signed out → 401

## Out of scope
- Bulk import.
