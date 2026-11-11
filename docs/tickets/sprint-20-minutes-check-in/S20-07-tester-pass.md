# S20-07 — Tester pass

**Source:** The sprint loop. **Depends on:** S20-01 to S20-06. **Size:** S

## Goal

Check the minutes, check-in, and logging fixes in a real browser, and write the report.

## Context

Same bar as the other sprints: Playwright's Chromium, light and dark, the phone widths and a desktop width.

## Steps

1. Walk S20-01 to S20-06 against each ticket's Done when, at 320, 360, 390 and 1280 px, light and dark.
2. Include a new piano-style minutes assignment, Update status on a chapters 16–18 week, Home with last week unchecked, log setup with the sample, Records and term in review with a finished book and no books-read field, and a one-day log plus a multi-day log.
3. Confirm a pages assignment still asks for a total, and that logging still does not move the plan.
4. Run axe, the tap-target script, a records smoke if one covers the log, and `bash scripts/check.sh`.
5. Write `docs/reviews/sprint-20-verification.md` (verdict, pass or fail per ticket, findings with severity).

## Done when

- The report is in `docs/reviews/` and the gate is ALL GREEN.
- High or Medium findings are listed for a fix ticket. They are not fixed inside this ticket.

## Tests

- The report names each ticket pass or fail, with the widths and themes that were opened.

## Out of scope

- Fixing a new finding in this same ticket.
- Sprint 21.
