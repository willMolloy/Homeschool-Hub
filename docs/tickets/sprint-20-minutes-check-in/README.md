# Sprint 20 — Minutes, check-in, and logging

> **Status: decided, not built.** DeeDee settled this on 2026-11-11 after using the app on current `main`. Nothing here is implemented. Sprint 18b is merged. Build Sprint 19 before this sprint. Do not fold Sprint 19, or the Sprint 18b tester follow-ups, into this folder.

One branch for the sprint, off `main` after Sprint 19 has merged. One commit per ticket, `bash scripts/check.sh` ALL GREEN before each commit, push after each. Progress in `docs/progress/sprint-20.md`. A PR to `main` only after the tester passes.

## Decisions (DeeDee, 2026-11-11)

- If the unit is minutes, ask only how many minutes a day, and the dates. Do not ask for a total number of minutes to finish, and do not follow the pages / lessons / chapters "how much content" pattern. Piano can be 30 minutes a day with nothing to finish. The bar's thickness comes from that daily amount. Add, edit, and the plan should all treat it that way.
- On Update status, if the week was scheduled as chapters 16–18, "got through" starts at 18, not 19. Switching to ahead or behind must not change that number by itself. The automatic step up or down is sneaky. The same goes for working ahead.
- Last week's check-in feels like a secret. It is how the schedule and the weekly plan stay accurate. A pending check-in for the previous week should be obvious, for example on Home, and it stays optional. The needs-you pattern is already there; use it so the pending check-in is clear, with a short line on why it matters.
- The logging styles are vague names with a subtitle that repeats the name. She needs a plain explanation of what she is choosing, and what each option means. A live sample of a log, updating as she turns options on or off, is the way to show it.
- Take "books read" off Records and off logging. It is confusing, and it suggests the schedule and the log are linked. It is extra work with no real use in the log. Term in review can still show finished books by borrowing them from the schedule (assignments she marked finished), not from a books-read field on the log.
- Logging something that counts as a school day starts as one day. She can then choose to enter several days at once, and that opens the form that matches her logging style. On that path, say first day and last day clearly.

No new product question is open. Where a label was not chosen, the ticket gives a default and marks it as a default.

| # | Ticket | Depends on | Size |
|---|---|---|---|
| 1 | [S20-01 — Ask only for minutes a day](S20-01-ask-only-for-minutes-a-day.md) | — | M |
| 2 | [S20-02 — Leave the got-through number alone](S20-02-leave-the-got-through-number-alone.md) | — | S |
| 3 | [S20-03 — Show a pending check-in on Home](S20-03-show-a-pending-check-in-on-home.md) | — | S |
| 4 | [S20-05 — Take books read off the log](S20-05-take-books-read-off-the-log.md) | — | S |
| 5 | [S20-04 — Explain the logging styles with a sample](S20-04-explain-the-logging-styles-with-a-sample.md) | S20-05 | M |
| 6 | [S20-06 — Open a log on one day](S20-06-open-a-log-on-one-day.md) | S20-05 | S |
| 7 | [S20-07 — Tester pass](S20-07-tester-pass.md) | S20-01 to S20-06 | S |

S20-05 is built before S20-04 and S20-06 so the sample and the log form are not drawn with books read and then stripped.
