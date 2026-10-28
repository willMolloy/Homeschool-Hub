# S2a-04 — Add the list-assignments endpoint

**Depends on:** S2a-03  
**Size:** XS

## Goal
`GET /api/assignments` returns the family's assignments with their children.

## Context
JSON shape: `{ id, subjectId, title, unitType, totalUnits, minutesPerUnit, startDate, endDate, childIds, archived }`. `minutesPerUnit: null` = use the unit default (shown as estimated). Archived rows only with `?includeArchived=true`.

## Steps
1. `repos/assignmentRepo.ts` with `list`, sorted by start date, title, id; childIds aggregated (`array_agg … ORDER BY`).
2. Route in `routes/assignments.ts`.

## Done when
- [ ] The seeded family's 14 assignments come back with their child ids.

## Tests
- seed family → 14 rows, numbers are numbers, dates are strings
- archived hidden by default, shown with includeArchived
- other family's rows never appear
- signed out → 401

## Out of scope
- Paging, filtering by child.
