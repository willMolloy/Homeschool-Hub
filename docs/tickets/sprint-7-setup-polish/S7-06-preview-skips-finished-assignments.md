# S7-06 — The event preview skips finished assignments

**Finding:** Sprint 5 L1  
**Depends on:** none  
**Size:** XS

## Goal
The event preview lists only assignments with work left from today on.

## Steps
1. In `POST /api/plan/preview-event`, leave out an assignment and child whose plan has no remaining units from today on (finished, or ended before today) in both the before and after plans.

## Done when
- The tester's case (a new Wednesday event skipping Literature, today 2026-10-30) no longer lists "Aesop's Fables", which ended Sep 11.

## Tests
- API: a finished assignment is left out; one still running is listed.

## Out of scope
- Changing how `perDay` is computed.
