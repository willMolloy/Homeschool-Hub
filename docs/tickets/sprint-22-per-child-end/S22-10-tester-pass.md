# S22-10 — Tester pass

**Source:** The sprint loop. **Depends on:** S22-01 to S22-09. **Size:** S

## Goal

Check a shared book's per-child end in a real browser and write the report.

## Context

This sprint changes the plan, the year bar, the finish question, and the break sheet. The independent tester writes the report. The developer does not.

## Steps

1. Walk S22-01 to S22-09 against each ticket's Done when, at 320, 360, 390 and 1280 px, light and dark.
2. Include a shared book whose ends match, one whose ends differ, one child finished while the other is open, Update status for one child and for everyone, the finish questions, a break that overlaps a forked book, and one undo that restores both children.
3. Confirm a book that was not edited still has one end, one Together bar, and one break row.
4. Run axe, the tap-target script, and `bash scripts/check.sh`.
5. Write `docs/reviews/sprint-22-verification.md` (verdict, pass or fail per ticket, findings with severity).

## Done when

- The report is in `docs/reviews/` and the gate is ALL GREEN.
- High or Medium findings are listed for a fix ticket. They are not fixed inside this ticket.

## Tests

- The report names each ticket pass or fail.

## Out of scope

- Fixing a new finding in this same ticket.
- Hosting.
- Marking the pull request ready, or merging it.
