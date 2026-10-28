# S1-28 — Add the list-subjects endpoint

**Depends on:** S1-13  
**Size:** XS

## Goal
`GET /api/subjects` returns the signed-in family's subjects, sorted by sort_order then name, with archived ones excluded unless `?includeArchived=true`.

## Context
Table `subject` from `db/001_init.sql`: `id, family_id, name, color, sort_order, archived_at`; unique name per family (case-insensitive) among non-archived. Always filter by `family_id = request.familyId` from the session (S1-13). Never trust an id from the client for ownership.

## Steps
1. Create `apps/api/src/repos/subjectRepo.ts` with `listSubjects(db, familyId, includeArchived)` using one parameterized SQL query.
2. Map rows to JSON `{ id, name, color, sortOrder, archived: boolean }` in one `toSubjectJson(row)` function.
3. Route `GET /api/subjects` (protected) in `apps/api/src/routes/subjects.ts`, registered from app.ts.

## Done when
- [ ] Returns only this family's rows, sorted correctly.

## Tests
- integration: two families seeded → each sees only its own
- archived excluded by default, included with the flag
- sort order respected
- signed out → 401

## Out of scope
- Create/update (next tickets).
