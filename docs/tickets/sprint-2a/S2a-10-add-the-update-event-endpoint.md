# S2a-10 — Add the update-event endpoint

**Depends on:** S2a-09  
**Size:** S

## Goal
`PATCH /api/events/:id` changes an event's fields, replaces its rules or children, or archives/unarchives it.

## Context
Same fields as create, all optional, plus `archived`. `subjectRules` and `childIds`, when sent, replace the existing set. `startDate/endDate: null` clears them.

## Steps
1. Load for the family (404 otherwise), validate merged dates, update in one transaction, return the list shape.

## Done when
- [ ] Archiving an event removes its effect from `/api/plan`.

## Tests
- each field alone
- rules replaced
- archive round-trip
- foreign/malformed id → 404
- empty body → 400

## Out of scope
- Deleting events.
