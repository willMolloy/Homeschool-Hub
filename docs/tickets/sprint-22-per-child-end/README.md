# Sprint 22 — Each child on a shared book has their own end

> **Status: in progress** on `hh2/sprint-22`, cut from `main` at the Sprint 18c merge (PR #24, `664682d`). S22-10 is the tester pass and is not part of this build. The pull request stays a draft. Do not mark it ready, and do not merge it. Hosting stays on hold.

A shared assignment is one book for two or more children. The engine already plans each child separately, so check-ins and the weekly load can diverge. The planned end date, and finished or stopped, still live on the assignment, so changing the end or marking it finished applies to every child on it.

This sprint moves those onto each child. A migration copies today's values, so nothing changes until a parent changes one child. One book stays one book. A different set of school days is still a separate workbook (Sprint 18b).

## Decisions

DeeDee wants the end and the finish forked per child, without making separate assignments. Where she has not picked a detail, the ticket states the conservative default. Those defaults are also listed in `docs/progress/sprint-22.md`. None of them block the build.

| # | Ticket | Depends on | Size |
|---|---|---|---|
| 1 | [S22-01 — Copy each child's end from the book](S22-01-copy-each-childs-end-from-the-book.md) | — | M |
| 2 | [S22-02 — Plan each child to their own end](S22-02-plan-each-child-to-their-own-end.md) | S22-01 | M |
| 3 | [S22-03 — Change one child's end](S22-03-change-one-childs-end.md) | S22-01, S22-02 | M |
| 4 | [S22-04 — Ask whether one child finished](S22-04-ask-whether-one-child-finished.md) | S22-03 | M |
| 5 | [S22-05 — Update status for one child](S22-05-update-status-for-one-child.md) | S22-03 | S |
| 6 | [S22-06 — Keep one year bar while the ends match](S22-06-keep-one-year-bar-while-the-ends-match.md) | S22-02 | S |
| 7 | [S22-07 — Ask about a break for each child's end](S22-07-ask-about-a-break-for-each-childs-end.md) | S22-03 | M |
| 8 | [S22-08 — Undo restores each child's end](S22-08-undo-restores-each-childs-end.md) | S22-03, S22-07 | S |
| 9 | [S22-09 — Read each child's end everywhere else](S22-09-read-each-childs-end-everywhere-else.md) | S22-02, S22-04 | M |
| 10 | [S22-10 — Tester pass](S22-10-tester-pass.md) | S22-01 to S22-09 | S |

Build S22-01 before anything that reads the new columns. S22-03 is the write that lets one child diverge; S22-04, S22-05, S22-07 and S22-08 use it. S22-02 can follow S22-01 without the edit screen. Do not merge the sprint. S22-10 is the independent tester's.
