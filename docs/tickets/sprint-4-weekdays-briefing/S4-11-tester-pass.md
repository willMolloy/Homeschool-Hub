# S4-11 — Tester pass: weekdays, briefing and missed days

**Source:** HOW_WE_WORK.md, "Tester"  
**Depends on:** S4-01 to S4-10  
**Size:** S

## Goal
The tester independently verifies Sprint 4 against each ticket's "Done when" and the edge cases below, and writes `docs/reviews/sprint-4-verification.md`.

## Steps
1. Run `bash scripts/check.sh` at the sprint's last commit and record the result.
2. Check each "Done when" item with evidence (a test, a request and response, or a browser screenshot at 360 px).
3. Edge cases, at least:
   - a Friday-only assignment with a Friday holiday, a Friday event set to skip, and a family whose school days exclude Friday;
   - changing a subject's default with customised and uncustomised assignments;
   - weekdays with check-ins (behind, ahead, unplanned progress);
   - a shared assignment for two children with one missed day;
   - the briefing with no check-ins ever, and with only one check-in;
   - marking a missed day twice, and on a day with an event;
   - time zones (`test:tz`), and the demo login.
4. Findings with severity, steps to reproduce, expected vs actual.

## Done when
- The report covers every ticket and lists every finding; the tester changes no source or test files.

## Out of scope
- Fixing findings.
