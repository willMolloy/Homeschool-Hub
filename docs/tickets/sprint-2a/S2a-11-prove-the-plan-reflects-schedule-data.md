# S2a-11 — Prove the plan reflects schedule data

**Depends on:** S2a-05, S2a-07, S2a-09  
**Size:** S

## Goal
Integration tests show that an assignment, an event and a vacation created **through the API** change `/api/plan` exactly as `planAll` predicts for the same inputs.

## Context
This is the contract the timeline will rely on: whatever the forms save is what the engine plans. Build expectations by calling the engine directly with hand-written inputs, not by re-reading the DB.

## Steps
1. Fresh family with settings set via `PATCH /api/family`, one child and one subject via the existing endpoints.
2. Create an assignment → compare `/api/plan` with `planAll` on the equivalent hand-built inputs.
3. Add a 'skip' event on Wednesdays → Wednesdays go to 0 and the work moves to other days as predicted.
4. Add a vacation week → those days are 0 and minutes rise elsewhere as predicted.
5. Archive the event, delete the vacation → back to the first plan.

## Done when
- [ ] All four stages match the engine exactly (minutes per day, warnings).

## Tests
- the four stages above
- a 'lighter' event with capacity 0.5 halves that day's capacity as the engine predicts

## Out of scope
- Week overrides (not shipped; see README).
