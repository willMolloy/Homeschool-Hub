# S5-09 — 44 px tap targets on every core screen

**Source:** ROADMAP.md, "Phone finishing pass"  
**Depends on:** S5-08  
**Size:** M

## Goal
Every interactive control on the core screens is at least 44 by 44 px at 360 px wide, and a script checks it.

## Context
- `scripts/smoke/` has Playwright browser scripts and an axe check (`scenarios/axe.mjs`).

## Steps
1. Add `scripts/smoke/scenarios/tap-targets.mjs`: sign in with the demo login, visit This Week, Timeline (with a bar selected), Kids, Subjects, Schedule, Assignments, Days off, Events and Settings at 360 px, and list every visible button, link, input, select and summary smaller than 44 px in either dimension (inline text links inside sentences are exempt).
2. Fix every control it reports, using the shared button and field styles.
3. Document how to run it in `scripts/README.md`.

## Done when
- The script reports no undersized controls on those screens.

## Tests
- The script itself, run in the tester pass; existing web tests still pass.

## Out of scope
- Desktop layouts; running the script in CI.
