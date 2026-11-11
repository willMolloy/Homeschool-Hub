# S19-07 — Tester pass

**Source:** The sprint loop. **Depends on:** S19-01 to S19-06. **Size:** S

## Goal

Check the six visual and print fixes in a real browser, and write the report.

## Context

Same bar as the other sprints: Playwright's Chromium, light and dark, the phone widths and a desktop width.

## Steps

1. Walk S19-01 to S19-06 against each ticket's Done when, at 320, 360, 390 and 1280 px, light and dark.
2. Include the right-hand assignment panel, Home's two cards, Records' Log button, a light bar beside a heavy bar, the weekly print preview, a named long break on the year view, and a school week that skips Wednesday: that Wednesday is absent from the year view and unlabeled at This month.
3. Confirm the on-screen Bars / Days toggle still switches, and that adding a minutes assignment still asks what it asks today.
4. Run axe, the tap-target script, the print smoke if one covers the weekly sheet, and `bash scripts/check.sh`.
5. Write `docs/reviews/sprint-19-verification.md` (verdict, pass or fail per ticket, findings with severity).

## Done when

- The report is in `docs/reviews/` and the gate is ALL GREEN.
- High or Medium findings are listed for a fix ticket. They are not fixed inside this ticket.

## Tests

- The report names each ticket pass or fail, with the widths and themes that were opened.

## Out of scope

- Fixing a new finding in this same ticket.
- Sprint 20 or Sprint 21.
