# S8b-06 — Smoke scenarios follow the new screens

**Finding:** S8 tester N6 (Medium): 20 of 26 scenarios in `scripts/smoke/scenarios/` fail on old selectors and routes.  
**Depends on:** S8b-01 to S8b-05  
**Size:** S

## Goal
Every smoke scenario passes against the Soft Paper screens.

## Steps
1. Update routes and selectors (prefer roles and labels over CSS classes); delete a scenario only if its feature no longer exists, and say so in the progress doc.

## Done when
- All scenarios pass locally on 127.0.0.1.
