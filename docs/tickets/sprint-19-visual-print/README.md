# Sprint 19 — Visual and print polish

> **Status: in progress** on `hh2/sprint-19`, cut from `main` at the Sprint 18b merge (`a9fcf0d`). DeeDee used the app and settled this on 2026-11-11. Sprint 18b is already merged. Do not fold the Sprint 18b tester follow-ups (`docs/tickets/sprint-18b-tester-follow-ups/`) into this sprint. Those wait until after Sprint 21.

One branch for the sprint. One commit per ticket, `bash scripts/check.sh` ALL GREEN before each commit. Progress in `docs/progress/sprint-19.md`. A draft PR while building; mark it ready only after the tester passes. Do not merge from this sprint.

## Decisions (DeeDee, 2026-11-11)

She looked at the app and wanted these fixed. They are display and print, not a new way of planning.

- When she adds or edits an assignment, the date picker can sit partly off the screen to the left of the right-hand panel. It has to stay fully visible, on a desktop and on a phone.
- On Home, the Records card should be the same height as the Schedule card.
- The Log button looks highlighted, as if she were already on a Log tab. It should look like a button she presses, not a tab she is on.
- Bar thickness is not showing the load. A day of about 40 minutes and a day of about 150 minutes looked almost the same width. Thickness should make that difference obvious. The bars should also be a little more opaque, still not a solid block of colour. Year bars have used a roughly 95th-percentile clamp; look at that again if it is why heavy and light bars match. Do not change how minutes are stored. That is Sprint 20.
- The weekly print is organized by assignment. She wants it by day: Monday and everything on Monday, then Tuesday, and so on. That is the printed sheet only. The on-screen Week Bars / Days toggle stays as it is.
- The school's regular weekly days off, such as Sunday and Wednesday when that is the configured week, do not need a label. They do not appear on the year view at all. They show only at a month zoom or closer, still with no label. That is how the empty wash stops looking like a glitch. A break of a week or longer still needs a name, and that title is shown on the year view. There is no automatic "Wednesdays off" label. She decided this after reading the first draft of the ticket.

A few tiny display details were not pinned down. Each ticket states a default and says it is a default, not an open question.

| # | Ticket | Depends on | Size |
|---|---|---|---|
| 1 | [S19-01 — Keep the date picker on screen](S19-01-keep-the-date-picker-on-screen.md) | — | S |
| 2 | [S19-02 — Match the Records card to Schedule](S19-02-match-the-records-card-to-schedule.md) | — | XS |
| 3 | [S19-03 — Make Log an action](S19-03-make-log-an-action.md) | — | XS |
| 4 | [S19-04 — Let bar thickness show the load](S19-04-let-bar-thickness-show-the-load.md) | — | M |
| 5 | [S19-05 — Group the weekly sheet by day](S19-05-group-the-weekly-sheet-by-day.md) | — | S |
| 6 | [S19-06 — Leave the usual days off off the year view](S19-06-show-a-title-on-each-break.md) | — | S |
| 7 | [S19-07 — Tester pass](S19-07-tester-pass.md) | S19-01 to S19-06 | S |
