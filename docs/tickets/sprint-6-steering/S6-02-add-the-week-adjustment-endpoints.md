# S6-02 — Add the week adjustment endpoints

**Source:** ROADMAP.md, "Adjust the current or a coming week"  
**Depends on:** S6-01  
**Size:** S

## Goal
The API can set, list and remove a week adjustment ("this week, do N instead; keep the end date or push it back") for one assignment and child.

## Context
- The `week_override` table exists (`001_init.sql`), one row per assignment, child (or all) and week; the engine already applies overrides.
- Finished weeks are recorded with check-ins, not adjustments.

## Steps
1. `PUT /api/week-overrides`: `{ assignmentId, childId|null, weekStart, plannedUnits, mode }`, strict. Upsert on the unique key, setting `updated_at = now()`.
   - `weekStart` must be the start of a week (family `weekStart`) and not before the family's current week.
   - `plannedUnits` from 0 to the assignment's total; `mode` is `keepEndDate` or `pushEndDate`.
   - The assignment and child must belong to the family, and the child to the assignment.
2. `GET /api/week-overrides?weekStart=` lists that week's rows.
3. `DELETE /api/week-overrides/:id` removes one.

## Done when
- Set, replace (the newer edit wins), list and remove work; a past week is a 400; another family's ids are rejected.

## Tests
- API integration: create, upsert replaces and bumps `updated_at`, list by week, delete; misaligned week, past week, out-of-range units, unknown mode, foreign assignment or child → 4xx; signed out → 401; the plan reflects a saved adjustment.

## Out of scope
- UI (S6-03).
