# S4-03 — Accept and return weekdays on the subject endpoints

**Source:** ROADMAP.md, "Assignment weekdays"  
**Depends on:** S4-02  
**Size:** S

## Goal
The subject endpoints accept and return `defaultWeekdays`.

## Context
- `routes/subjects.ts` already handles `defaultWeight` the same way (create, patch, null clears). Follow it.

## Steps
1. `POST /api/subjects` and `PATCH /api/subjects/:id` accept `defaultWeekdays: number[] | null` (optional): 1–7 distinct integers 0–6. `null` clears it.
2. Subject JSON includes `defaultWeekdays` (an array sorted ascending, or null).

## Done when
- Valid values round-trip; invalid ones are 400 with a clear message; unknown fields are still rejected.

## Tests
- API integration: create with and without; patch to a value, then to null; out-of-range, duplicate and empty-array values → 400; list returns the field.

## Out of scope
- The subject form (S4-06).
