# S7-14 — Tester pass: setup and polish

**Source:** HOW_WE_WORK.md, "Tester"  
**Depends on:** S7-01 to S7-13  
**Size:** S

## Goal
The tester verifies S7-01 to S7-12 against each "Done when", reviews S7-13's report for anything it missed, and writes `docs/reviews/sprint-7-verification.md`.

## Steps
1. Gate with labelled counts; screenshots in `docs/progress/screens/sprint-7/`.
2. Edge cases: rolling over across a leap day and with 60+ assignments; copying to a child with no assignments; zoom views at the 6-view limit, a view outside the grid, deleting the selected view; the tap-target script at 320 and 360 px; the original findings (L1–L3, O1, O4, L6, N1) re-run.
3. Findings with severity and steps to reproduce.

## Done when
- The report covers every ticket; no source or test files changed.

## Out of scope
- Fixing findings.
