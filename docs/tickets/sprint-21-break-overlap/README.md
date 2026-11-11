# Sprint 21 — Breaks that adjust overlapping assignments

> **Status: decided, not built.** DeeDee settled this on 2026-11-11. Breaks already exist. This sprint is the overlap question: when a new or longer break covers work she already planned, the app asks what to do. It does not quietly reschedule. Nothing here is implemented. Build Sprint 18b, then 19, then 20, before this sprint.

This is one planning change, so the sprint stays small. One branch off `main` after Sprint 20 has merged. One commit per ticket, `bash scripts/check.sh` ALL GREEN before each commit, push after each. Progress in `docs/progress/sprint-21.md`. A PR to `main` only after the tester passes.

## Decisions (DeeDee, 2026-11-11)

Taking February off, or any break that lands on days an assignment already uses, should ask about each overlapping assignment. The three choices, for each one:

- Increase the workload in the other weeks and keep the same end date.
- Push the end date back by the length of the break.
- Push the end date to a day she picks.

A partial overlap still counts. An assignment she has already marked finished is not moved. She can undo the whole change. This is a real change to the plan, said out loud, not a silent reschedule.

Today, saving a break already pulls those days out of the plan and keeps the end date, which is the first choice, done with no question. This sprint puts the question in front of that save.

No new product question is open. The tickets mark defaults where she did not pick a detail.

| # | Ticket | Depends on | Size |
|---|---|---|---|
| 1 | [S21-01 — Ask before a break moves open work](S21-01-ask-before-a-break-moves-open-work.md) | — | M |
| 2 | [S21-02 — Keep the end date when a break overlaps](S21-02-keep-the-end-date-when-a-break-overlaps.md) | S21-01 | S |
| 3 | [S21-03 — Move the end date when a break overlaps](S21-03-move-the-end-date-when-a-break-overlaps.md) | S21-01, S21-02 | M |
| 4 | [S21-04 — Undo a break with the schedule changes](S21-04-undo-a-break-with-the-schedule-changes.md) | S21-02, S21-03 | S |
| 5 | [S21-05 — Tester pass](S21-05-tester-pass.md) | S21-01 to S21-04 | S |

Build S21-02 before S21-03 so a sheet can mix "keep the end date" with a push. S21-01 lists all three choices and does not apply them. Each later ticket makes its choice a real save. Do not merge the sprint while a choice is still only a label.
