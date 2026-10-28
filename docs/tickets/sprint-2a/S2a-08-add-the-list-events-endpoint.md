# S2a-08 — Add the list-events endpoint

**Depends on:** S2a-03  
**Size:** XS

## Goal
`GET /api/events` returns the family's recurring events with their children and per-subject rules.

## Context
Shape: `{ id, name, weekdays, startDate, endDate, capacityFraction, defaultRule, subjectRules: { [subjectId]: 'skip'|'lighter'|'normal' }, childIds, archived }`. `childIds: []` = whole family; `startDate/endDate` null = open-ended.

## Steps
1. `repos/eventRepo.ts` `list` (name, id order) plus child and rule aggregation.
2. Route in `routes/events.ts`; `?includeArchived=true`.

## Done when
- [ ] Seeded events come back with their rules.

## Tests
- seed family events match the seed
- archived hidden by default
- family-scoped
- signed out → 401

## Out of scope
- One-off events.
