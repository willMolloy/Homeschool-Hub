# S18c-07 — Tester pass

**Source:** The sprint loop. **Depends on:** S18c-01 to S18c-06. **Size:** S

## Goal

Check the six follow-ups in a real browser and write the report.

## Context

This sprint is display and layout. The plan's stored minutes, the past-date question, and which book is a copy only change as the tickets say. S18c-07 is the independent tester's pass. It is not part of the build.

## Steps

1. Walk S18c-01 to S18c-06 against each ticket's Done when, at 320, 360, 390 and 1280 px, light and dark. Include 360 and 440 px at about 800 px tall for S18c-02 and S18c-05.
2. Copy Treasure Island to a new year and confirm this year's book does not list it under Other copies and does not gain a days suffix from it. A same-time copy with the same child and the same days shows its dates. Wren's Hobbit and the shared Hobbit still list each other, and updating one leaves the other unchanged.
3. On a past Pick a date, Continue, No and Cancel are on screen together without scrolling. No and Cancel save nothing. Continue still saves.
4. At 360 px on Year, a long title still shows its days. At 1280 px a title that fits still shows in full. Christmas break and Family visit do not draw on top of each other at 360 or 440 px, and both read in full at 1280 px when they fit.
5. Other copies sits clear of Save. Saving the form writes only the workbook that was opened.
6. A minutes book that stores 66.67 shows a whole number of minutes. Saving it without a change still stores 66.67. A book set to 30 shows 30 and stores 30.
7. Run axe, the tap-target script, and `bash scripts/check.sh`.
8. Write `docs/reviews/sprint-18c-verification.md` (verdict, pass or fail per ticket, findings with severity).

## Done when

- The report is in `docs/reviews/` and the gate is ALL GREEN.
- High or Medium findings are listed for a fix ticket. They are not fixed inside this ticket.

## Tests

- The report names each ticket pass or fail.

## Out of scope

- Fixing a new finding in this same ticket.
- L2. Opening this week's amount on the other child's whole week stays as Sprint 18b recorded it.
- A per-child end date on a shared assignment. That was only discussed. It is not a ticket.
- Hosting.
