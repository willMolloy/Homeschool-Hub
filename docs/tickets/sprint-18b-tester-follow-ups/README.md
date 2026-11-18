# Follow-ups from the Sprint 18b tester

> **Status: ticketed, not built.** Build these after Sprint 21. Do not fold them into Sprint 21. S18c-05 was added from the Sprint 19 tester round 2. S18c-06 was added from the Sprint 20 tester. Both wait in this same queue.

PR #20 merged Sprint 18b to `main` as `a9fcf0d` on 2026-11-11. The independent tester's pass on the tested head `d565cf2` was **READY**, with 0 High / 1 Medium / 4 Low. The report is attached to that pass; it is not copied into `docs/reviews/` by this folder. This folder holds the Medium and three Lows from that pass, plus S18c-05 from the Sprint 19 tester round 2 and S18c-06 from the Sprint 20 tester. L2 is not a ticket.

Nothing here is implemented. Sprint 19 and Sprint 20 are merged. Sprint 21 is built on `hh2/sprint-21` and is not merged. Build this folder after Sprint 21.

| # | Ticket | Source | State | Size |
|---|--------|--------|-------|------|
| 1 | [S18c-01 — Other copies are the workbooks running at the same time](S18c-01-other-copies-are-the-same-time.md) | M1 (Medium) | Ticketed. Not built. | S |
| 2 | [S18c-02 — Keep Continue and No on screen](S18c-02-keep-continue-and-no-on-screen.md) | L1 (Low) | Ticketed. Not built. | XS |
| 3 | [S18c-03 — Keep the days on a long year-view title](S18c-03-keep-the-days-on-a-long-title.md) | L3 (Low) | Ticketed. Not built. | S |
| 4 | [S18c-04 — Give Other copies room above Save](S18c-04-give-other-copies-room-above-save.md) | L4 (Low) | Ticketed. Not built. | XS |
| 5 | [S18c-05 — Keep adjacent break titles apart](S18c-05-keep-adjacent-break-titles-apart.md) | Low, Sprint 19 tester round 2 | Ticketed. Not built. | S |
| 6 | [S18c-06 — Show whole minutes](S18c-06-show-whole-minutes.md) | Low, nice-to-have, Sprint 20 tester | Ticketed. Not built. | S |

## Not a ticket

- **L2.** "This week's amount" on another copy opens that child's whole week. `docs/progress/sprint-18b.md` records that as the behaviour that was built ("This week's amount opens that child's current week"). It is not a change to make.
- **A per-child end date, or a finish fork, on a shared assignment.** That was only discussed. It was not decided, and it is not a ticket.
