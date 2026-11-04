# Sprint 12 — "Did Frank finish…?" and the needs-you dot

> **Status: planned, after Sprint 11** (order agreed by Will, 2026-11-05). Decisions: `docs/progress/decisions-2026-11-04.md` and ROADMAP "Order of work after Sprint 10", item 2. One branch for the sprint, PR after its tester passes (HOW_WE_WORK, "Branches").

## Decisions (Will, 2026-11-04 and 2026-11-05)
- When an assignment's end date passes, Home asks **"Did Frank finish Treasure Island?"** with **Yes, finished / Not yet / We stopped**. It should catch the eye (a clear card, not the quiet briefing line).
- **Yes** marks it finished with that date. **Not yet** offers to move the end date; the question returns at the new end. **We stopped** marks it dropped; it never counts as finished.
- Only the parent's answer marks an assignment finished; nothing is assumed. It is a schedule fact, not a log entry (logging stays separate).
- **The needs-you dot:** a small fern-accent dot (never alarm red) on the Home tab and the rail while a question waits. Only things that need an answer light it; passive warnings (late, heavy week) don't.

Build in order, one commit per ticket, gate ALL GREEN, push after each. Progress in `docs/progress/sprint-12.md`. Check at 320, 360 and 1280 px in light and dark.

| # | Ticket | Size |
|---|--------|------|
| 1 | [S12-01 — Store how an assignment ended](S12-01-store-how-it-ended.md) | S |
| 2 | [S12-02 — Which assignments are waiting for an answer](S12-02-waiting-for-an-answer.md) | S |
| 3 | [S12-03 — The question on Home](S12-03-the-question-on-home.md) | M |
| 4 | [S12-04 — Finished and stopped work on the schedule](S12-04-finished-and-stopped-on-the-schedule.md) | M |
| 5 | [S12-05 — The needs-you dot](S12-05-needs-you-dot.md) | S |
| 6 | [S12-06 — Change an answer](S12-06-change-an-answer.md) | XS |
| 7 | [S12-07 — Docs and a smoke scenario](S12-07-docs-and-smoke.md) | XS |
| 8 | [S12-09 — Sprint 11 leftovers](S12-09-sprint-11-leftovers.md) | XS |
| 9 | [S12-08 — Tester pass](S12-08-tester-pass.md) | S |

**Added after the Sprint 11 re-test (2026-11-05):** S12-09 carries the open Lows N7–N9 from `docs/reviews/sprint-11-verification.md`; build it before S12-08.
