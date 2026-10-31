# Sprint 7 progress: setup and polish

Tickets: `docs/tickets/sprint-7-setup-polish/`. Pass A covers S7-01 to S7-05 (rollover, sibling reuse, custom zoom views). The other Sprint 7 tickets are a later pass.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S7-01 Copy a year's plan into a new year | (this commit) | `CopyToNewYearPanel` (`schedule/CopyPanels.tsx`) in the Assignments `panels` slot; `copyPlan.ts` holds `shiftedCopy`, `copyCandidates` and the chunked bulk save |

## Decisions (conservative calls on ambiguous points)

- **S7-01 no default dates.** Both first days start empty (the app stores no school-year dates); nothing is listed until both are valid dates. A line says what to do, and that only the plan is copied.
- **S7-01 what is offered.** Non-archived assignments starting on or after this year's first day whose subject is active and that still have an active child. An archived child is dropped from the copy (as `copyOfAssignment` does); an assignment with only archived children, or an archived subject, is left out because the API would refuse it.
- **S7-01 grouping.** Grouped by the children an assignment is for ("Frank", "Maggie", or "Frank, Maggie" for a shared one) rather than splitting a shared assignment under each child, so it is ticked once. Rows are ordered by start date, then title.
- **S7-01 partly saved.** Chunks of 50 go one after another and stop at the first failure. Earlier chunks stay: they are added to the list through a new `onAdded` on the `panels` render prop (adds rows without closing the panel). The panel stays open, says "Part 2 of 2 didn't save: <title>: <message> 50 copies were created.", and offers only the assignments not yet copied, so Copy again never duplicates. The list of sources is fixed when the panel opens, so the copies just created are never offered.
- **S7-01 copied as stored.** `weightPerUnit` and `weekdays` are copied exactly (null stays null); title is unchanged (no " (copy)"), because the copies are for another year.
