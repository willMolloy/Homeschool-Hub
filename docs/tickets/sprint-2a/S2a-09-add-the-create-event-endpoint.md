# S2a-09 — Add the create-event endpoint

**Depends on:** S2a-08  
**Size:** S

## Goal
`POST /api/events` creates a recurring event with per-subject rules and the children it applies to.

## Context
Body: `{ name, weekdays, startDate?, endDate?, capacityFraction?, defaultRule?, subjectRules?, childIds? }` (defaults 0.5, 'normal', {}, []). `subjectRules` keys must be the family's active subjects.

## Steps
1. Validate (S2a-03 pieces; rule enum; subjectRules keys are UUIDs, ≤ 100 entries; prototype keys like `__proto__` rejected).
2. Reference checks → 400 `invalid_reference`.
3. Insert event, `event_child`, `event_subject_rule` in one transaction; 201 with the list shape.

## Done when
- [x] A created event changes `/api/plan` on its weekdays.

## Tests
- valid → 201 with rules and children
- defaults applied
- empty weekdays, weekday 7, capacity 1.5 / -0.1, rule 'maybe', end < start, foreign subject or child → 400
- signed out → 401

## Out of scope
- Time-of-day, one-off dates.
