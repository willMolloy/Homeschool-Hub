# Sprint 18 progress: fixes from the second end-to-end run

Branch: `claude/sprint-18-e2e-fixes`, cut from `main` on 2026-11-06 with Will's permission for per-sprint branches. Tickets: `docs/tickets/sprint-18-e2e-fixes/` (findings E1 to E13 in `docs/reviews/cm-term-run-2.md`). S18-05 (the tester pass) is not part of this build.

| Ticket | Commit | Notes |
|---|---|---|
| S18-01 Update status confirms and can be undone | (this commit) | **E1.** `PUT /api/check-ins/:weekStart` now goes through `services/statusSave.ts` (`saveStatus`): it writes the week as before, then records ONE undo entry ("Updated Treasure Island") whose new step `weekCheckIns` holds every check-in row the week had and its review status, so Undo puts the week back exactly (rows, positions, modes and the review row, or no review row if there was none). The web client lists the PUT among the plan-changing requests, so the undo bar asks `/api/undo` and shows "Updated Treasure Island. Undo" after a save from a Week bar, the Year edit bar or a finished week. A 409 on that save now shows the API's sentence in the sheet instead of the generic one. **Also built here for S18-02:** the body takes an optional `endDate: { assignmentId, endDate }`, applied in the same transaction after the check-ins (so the latest check-in holds the new end), with the assignment's earlier state as a second undo step (label "Updated X, end moved to Feb 1"). A refused end date rolls the whole save back and records nothing. No new route; viewers still cannot call it (the viewer allow-list is untouched and a test pins `PUT /api/check-ins/:weekStart` and `POST /api/undo` as closed). Tests: api `s18-01-update-status-undo` (5: label and undo of a save, second save replaces the entry, end date with one undo, refused date changes nothing, viewer allow-list), web `update-status` (2: the bar after a Week save and a finished-week save, and Undo). **Changed expectations:** web `undo-bar` moved `PUT /api/check-ins/…` from "is not announced" to "is announced once"; the fake API's body keys for `PUT /api/check-ins/:id` gained `endDate` |

## Decisions

- **S18-01 one entry per save, even a no-op:** a save always records an entry. A save that changed nothing would otherwise leave an older entry on the API for the bar to offer, which would undo the wrong thing.
- **S18-01 label:** "Updated {title}" (the ticket's words). When the end date also moved it adds ", end moved to {date}". More than one assignment changed (not reachable from the screens) reads "Updated 2 assignments".
- **S18-01 undo order:** the check-ins go back first, then the assignment's end date, so restoring an earlier end never meets a newer check-in.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S18-01 | 437 | 1203 | 1714 | 190 |
