# Sprint 18b progress: follow-ups from the Sprint 18 tester

Branch: `hh2/sprint-18b`, cut from `main` (`93c183a`). Tickets: `docs/tickets/sprint-18b-follow-ups/`.

**Merged:** PR #20, `a9fcf0d`, 2026-11-11. Tested head `d565cf2`. The independent tester reported READY: 0 High / 1 Medium / 4 Low. The Medium and L1, L3, and L4 are ticketed in `docs/tickets/sprint-18b-tester-follow-ups/` and are not built. They follow Sprint 21. L2 is the behaviour recorded below ("This week's amount opens that child's current week") and is not a ticket. A per-child end date on a shared assignment was only discussed and is not a ticket. Sprint 19 is built on `hh2/sprint-19` and is not merged. Sprints 20 and 21 stay ticketed and unbuilt. Hosting stays on hold.

| Ticket | Commit | Notes |
|---|---|---|
| S18b-01 A past Pick a date asks before it saves | 91b2edd | **M1.** Pick a date still has no minimum of today. In Update status, Save on a date before the family's today (and after the end of the week being updated) asks "That's before today; this ends the book now. Continue?" and sends nothing until Continue. Continue saves as before, including the one undo entry ("Updated Treasure Island, end moved to Oct 27"). No, Cancel, or closing the sheet leaves the end date. A date on or before that week's end is still "Pick a date after Oct 25, 2026." and never asks. Today, and a later date that is still before the current end (Nov 20 against Dec 18), save with no new question. Tests: web `s18b-01-past-end-date` (5), api `s18-01-update-status-undo` gained the past-date undo (the week and the end come back with no differences). |
| S18b-02 A shared book keeps one set of school days | (this commit) | **M2.** An assignment still has one `weekdays` list for every child on it. There is no per-child school-day planner. A different schedule is another assignment of that book. **Copy to another child** can set the copies' school days when they are made ("Set the copies' school days"); until then each copy keeps that book's days, and the original is not changed. The single Copy form says the copy is its own workbook and its day chips are the place to set them. Two open workbooks of the same book (a trailing " (copy)" still counts, an archived row does not) are named with their days in Set up › Assignments ("Elias, Clara · Mon–Thu" against "Wren · Tue–Fri") and on the Year bar and edit sheet ("Gospel of Luke · Tue–Fri"). A book with no twin is unchanged. From one copy, Other copies lists the rest and opens the same kind of update on the one you pick: this week's amount (that child's week), Update status, or the finish question ("Did Wren finish Gospel of Luke?"). Saving one sends only that copy. The Hartley seed's Tuesday-to-Friday copies are unchanged. Tests: web `s18b-02-shared-book-days` (10). |

## Decisions

- **S18b-01 the question is in the sheet, not a second dialog.** The words are the tester's sentence. Continue saves. No puts the question away and leaves the date in the field. Cancel and the sheet's close leave it unanswered, so nothing is saved.
- **S18b-01 "before today" is the family's today** (`me.today`), the same day the rest of the app uses. A date equal to today does not ask.
- **S18b-01 the lower limit is unchanged.** The picked date still has to fall after the end of the week being updated. That refusal wins over the confirmation. The DateField is not given a minimum.
- **S18b-02 one set of days.** School days stay a field on the assignment. Children on that assignment follow those days. A child with different days gets another assignment. Nothing in the planner skips a day for one child of a shared book.
- **S18b-02 telling them apart.** The days are added only when there is another open workbook of the same book (same subject, same title with a trailing " (copy)" ignored). Otherwise the cards and bars stay as they were.
- **S18b-02 the copy's days.** "Set the copies' school days" starts from the days every chosen book already shares, or the family's school days when they don't. The days are stored on the copies. "Same days as each book" puts that choice back. The original assignments are not patched.
- **S18b-02 the other copy's update.** This week's amount opens that child's current week. Update status and the finish question open on the copy you picked. None of the three writes the copy you were looking at, and none of them moves the other copy onto the same page or chapter.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S18b-01 | 437 | 1208 | 1755 | 190 |
| S18b-02 | 437 | 1208 | 1765 | 190 |
