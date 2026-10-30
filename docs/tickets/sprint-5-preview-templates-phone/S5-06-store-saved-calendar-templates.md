# S5-06 — Store saved calendar templates

**Source:** ROADMAP.md, "Calendar templates" ("Save this year as a template")  
**Depends on:** none  
**Size:** S

## Goal
A family can store, list and delete named calendar templates.

## Steps
1. Migration (next number): `calendar_template (id, family_id, name, breaks jsonb, created_at)`, family-scoped with ON DELETE CASCADE. `breaks` is a list of `{ offsetDays, lengthDays, label, kind }`, offsets counted from the year's first day.
2. API: `GET /api/calendar-templates`, `POST` (name 1–60 chars, 1–100 breaks, offsets 0–400, lengths 1–60, kind in the day-off kinds), `DELETE /api/calendar-templates/:id`. Strict bodies; family-scoped.

## Done when
- Templates round-trip and are invisible to other families.

## Tests
- DB: migration and checks. API: create, list, delete; invalid breaks → 400; another family's id → 404; signed out → 401.

## Out of scope
- Editing a saved template (delete and save again); sharing.
