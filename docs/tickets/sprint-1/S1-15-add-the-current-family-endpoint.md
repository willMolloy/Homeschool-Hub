# S1-15 — Add the current-family endpoint

**Depends on:** S1-13  
**Size:** XS

## Goal
`GET /api/me` returns the signed-in family's id, name, week start and school days.

## Context
The web app calls this on start-up to learn whether it's signed in, and it needs `weekStart` and `schoolDays` for anything calendar-related.

## Steps
1. Route `GET /api/me` (protected).
2. Query `SELECT id, name, week_start, school_days FROM family WHERE id = $1` using `request.familyId`.
3. Respond `{ familyId, name, weekStart, schoolDays }` (camelCase in JSON, snake_case in SQL; do the mapping in one function).

## Done when
- [x] Signed in → family data; signed out → 401.

## Tests
- signed-in returns the seeded family
- signed-out → 401

## Out of scope
- Editing family settings (Sprint 2).
