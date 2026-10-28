# S2a-13 — Add the family settings form

**Depends on:** S2a-02, S2a-12  
**Size:** S

## Goal
`/schedule/settings` lets a parent change the family name, week start, school days and time zone.

## Context
Uses `GET/PATCH /api/family`. After saving, re-ask `/api/me` so the header name and the plan's week start update.

## Steps
1. Form: name (text), week starts (Monday/Sunday radios), school days (seven checkboxes), time zone (select from `Intl.supportedValuesOf('timeZone')`, current value first if unknown).
2. Client checks: name required, at least one school day.
3. Save → PATCH only changed fields; success message; server 400 shown inline.

## Done when
- [x] Changing school days and saving updates `/api/me` (and the plan view's columns).

## Tests
- loads current values
- submits only changed fields
- no school days → error, no request
- server 400 → message shown
- header name updates after save

## Out of scope
- Changing login email or password.
