# Sprint 18b progress: follow-ups from the Sprint 18 tester

Branch: `claude/sprint-18b-follow-ups`, cut from `main` on 2026-11-06 with Will's permission for per-sprint branches. Tickets: `docs/tickets/sprint-18b-follow-ups/` (M1 and M2 in `docs/reviews/sprint-18-verification.md`; DeeDee's decisions of 2026-11-06 are in ROADMAP "Decided after Sprint 18"). Grok started this sprint and stopped before building anything; this work was picked up from the tickets.

| Ticket | Commit | Notes |
|---|---|---|
| S18b-01 A past Pick a date asks before it saves | (this commit) | **M1.** In Update status, Pick a date still takes any date after the end of the week being updated. Saving a date before today no longer sends: the sheet swaps Cancel/Save for the question "That's before today; this ends the book now. Continue?" with **No** and **Continue**. Continue sends the same single `PUT /api/check-ins/:weekStart` as before (so one undo entry, "Updated X, end moved to Nov 3"); No hides the question and nothing is sent; changing the date drops the question and it is asked again for the new past date. A date on or before the end of the week is refused first ("Pick a date after Oct 25, 2026.") with no question; today and later save at once. "Today" is `todayOf(me)` (the same helper the completion screens use). No API change. Browser (Hartley seed, Rachel, Elias, A Child's History of the World, Nov 3, 2026): the question and No, at 320, 360 and 1280 px in light and dark, no sideways scroll, no control under 44 px (the three 22 px radios are measured through their 44 px label tiles, as before). Tests: web `s18b-01-past-end-date` (5: asks and sends nothing until Continue, then one PUT with 2026-10-27; No sends nothing and brings Save back; a changed date re-asks; the refused date has no question; today and a later date save at once). **Changed expectations:** web `s17-01-low-backlog` expected ROADMAP's open-backlog text to match `/None open/`; the docs pass after Sprint 18 reworded it to "None ticketed", which left `main` red on that one test, so it now accepts either (`/None (open\|ticketed)/`). |

## Decisions

- **S18b-01 where the question lives:** inside the sheet, in place of the Cancel/Save row (the sheet's own pattern for a twin name is the same Yes/No block), not a second dialog on top of a sheet. It is the sheet's own state, so it needs no new component.
- **S18b-01 only Pick a date asks.** Move the end to the suggested date is the briefing's own date and is never in the past in practice; the ticket scopes the question to a picked date.
- **S18b-01 the check is in the web sheet only.** The API already refuses an end before the latest check-in week; it does not know about "today" for a past date and the ticket does not ask it to.
- **S18b-01 the lower limit stays** the end of the week being updated, exactly as S18-02 left it.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S18b-01 | 437 | 1207 | 1755 | 190 |
