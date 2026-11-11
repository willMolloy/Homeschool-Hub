# Sprint 18b progress: follow-ups from the Sprint 18 tester

Branch: `hh2/sprint-18b`, cut from `main` (`93c183a`). Tickets: `docs/tickets/sprint-18b-follow-ups/`. Sprints 19, 20 and 21 stay ticketed and unbuilt. This branch is not merged.

| Ticket | Commit | Notes |
|---|---|---|
| S18b-01 A past Pick a date asks before it saves | (this commit) | **M1.** Pick a date still has no minimum of today. In Update status, Save on a date before the family's today (and after the end of the week being updated) asks "That's before today; this ends the book now. Continue?" and sends nothing until Continue. Continue saves as before, including the one undo entry ("Updated Treasure Island, end moved to Oct 27"). No, Cancel, or closing the sheet leaves the end date. A date on or before that week's end is still "Pick a date after Oct 25, 2026." and never asks. Today, and a later date that is still before the current end (Nov 20 against Dec 18), save with no new question. Tests: web `s18b-01-past-end-date` (4), api `s18-01-update-status-undo` gained the past-date undo (the week and the end come back with no differences). |

## Decisions

- **S18b-01 the question is in the sheet, not a second dialog.** The words are the tester's sentence. Continue saves. No puts the question away and leaves the date in the field. Cancel and the sheet's close leave it unanswered, so nothing is saved.
- **S18b-01 "before today" is the family's today** (`me.today`), the same day the rest of the app uses. A date equal to today does not ask.
- **S18b-01 the lower limit is unchanged.** The picked date still has to fall after the end of the week being updated. That refusal wins over the confirmation. The DateField is not given a minimum.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S18b-01 | 437 | 1208 | 1755 | 190 |
