# S7-03 — Store a family's zoom views

**Source:** Will, 2026-10-31 (custom zoom views)  
**Depends on:** none  
**Size:** S

## Goal
The family stores which built-in zoom views are hidden and its own named views.

## Steps
1. Migration (next number): `family.zoom_views jsonb NOT NULL DEFAULT '{"hidden":[],"custom":[]}'`.
2. `GET /api/family` returns `zoomViews`; `PATCH /api/family` accepts it: `hidden` is a subset of `["fall","spring","month"]`; `custom` is up to 5 items `{ id (uuid), name (1–30 chars), start, end }` with valid dates, start ≤ end, at most 400 days; the visible total (Year + shown built-ins + custom) is at most 6.

## Done when
- Valid views round-trip; invalid ones are 400 with a clear message; Year can't be hidden.

## Tests
- DB migration; API: round-trip, hiding Year rejected, 6 custom rejected, 4 custom with all three built-ins shown (8 visible) rejected, bad dates rejected.

## Out of scope
- UI.
