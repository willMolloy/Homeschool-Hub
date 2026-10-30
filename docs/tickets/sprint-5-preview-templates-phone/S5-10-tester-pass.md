# S5-10 — Tester pass: preview, templates and phone

**Source:** HOW_WE_WORK.md, "Tester"  
**Depends on:** S5-01 to S5-09  
**Size:** S

## Goal
The tester verifies Sprint 5 against each "Done when" and the edge cases below, and writes `docs/reviews/sprint-5-verification.md`.

## Steps
1. Run `bash scripts/check.sh` and record the labelled result.
2. Check each "Done when" item with evidence; screenshots go in `docs/progress/screens/sprint-5/`.
3. Edge cases: a preview for an event with no end date; an edit that removes a child; a preview while the plan has check-ins; templates across a weekStart of Sunday; a custom 1 on / 1 off; applying a template twice; a year spanning a leap day; the tap-target script on a 320 px screen.
4. Findings with severity and steps to reproduce.

## Done when
- The report covers every ticket; the tester changes no source or test files.

## Out of scope
- Fixing findings.
