# S2a-07 — Add the blocked-range endpoints

**Depends on:** S2a-03  
**Size:** S

## Goal
`GET/POST /api/blocked-ranges` and `PATCH/DELETE /api/blocked-ranges/:id` manage vacations and other days off.

## Context
Shape: `{ id, label, kind, startDate, endDate, childIds }`; `kind` ∈ vacation, holiday, sick, other; `childIds: []` = the whole family (the engine's `null`). The table has no `archived_at`, and nothing references a range, so DELETE really deletes (204).

## Steps
1. `repos/blockedRangeRepo.ts` (list sorted by start, create, update, delete) with `blocked_range_child` handled in transactions.
2. Validation: label optional ≤ 60, no NUL; dates per S2a-03; span ≤ 366 days; children must be the family's active children.
3. Routes in `routes/blockedRanges.ts`.

## Done when
- [x] A vacation created through the API shows up as blocked days in `/api/plan`.

## Tests
- CRUD round-trip
- childIds [] = whole family; specific children stored
- bad kind, end < start, 367-day span, foreign child → 400
- foreign/malformed id → 404 on PATCH and DELETE
- signed out → 401

## Out of scope
- Recurring holidays.
- Importing school calendars.
