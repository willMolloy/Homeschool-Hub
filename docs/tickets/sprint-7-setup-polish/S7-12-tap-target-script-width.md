# S7-12 — Let the tap-target script take a width

**Finding:** Sprint 5 L3  
**Depends on:** none  
**Size:** XS

## Goal
`scripts/smoke/scenarios/tap-targets.mjs` accepts a viewport width (default 360) so it can also run at 320.

## Steps
1. Read `TAP_WIDTH` (or a CLI flag) and use it for the viewport; document it in `scripts/README.md`.

## Done when
- `TAP_WIDTH=320 node flow.mjs tap-targets` runs at 320 px.

## Tests
- The script run in the tester pass at 320 and 360.

## Out of scope
- Running it in CI.
