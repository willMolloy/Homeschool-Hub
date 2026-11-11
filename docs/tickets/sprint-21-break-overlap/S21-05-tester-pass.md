# S21-05 — Tester pass

**Source:** The sprint loop. **Depends on:** S21-01 to S21-04. **Size:** S

## Goal

Check the overlap question in a real browser and against the engine, and write the report.

## Context

This sprint changes the plan. The tester should compare the plan before and after, not only the wording of the sheet.

## Steps

1. Walk S21-01 to S21-04 against each ticket's Done when, at 320, 360, 390 and 1280 px, light and dark.
2. Include a full-month overlap, a partial overlap, a finished book left alone, a shared book, cancel, keep, push-back, a custom day, a refused day inside the break, and one undo that restores a snapshot.
3. Add a break that overlaps nothing and confirm it still saves with no sheet.
4. Run axe, the tap-target script, and `bash scripts/check.sh`.
5. Write `docs/reviews/sprint-21-verification.md` (verdict, pass or fail per ticket, findings with severity).

## Done when

- The report is in `docs/reviews/` and the gate is ALL GREEN.
- High or Medium findings are listed for a fix ticket. They are not fixed inside this ticket.

## Tests

- The report names each ticket pass or fail, and says whether the plan snapshot matched after undo.

## Out of scope

- Fixing a new finding in this same ticket.
- Hosting.
