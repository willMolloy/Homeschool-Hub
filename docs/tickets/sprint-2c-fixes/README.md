# Sprint 2c — Fixes from the sprint 2b verification

These tickets fix the findings in `docs/reviews/sprint-2b-verification.md` (tester, Oct 28, 2026, at `a50f458`). They also cover DeeDee's product calls from the same morning:

- **M1:** block the week-start change; don't migrate.
- **L4:** parents can record progress on any active assignment, including one with nothing planned that week.

Each ticket uses the sprint-2a format: Goal / Context / Steps / Done when / Tests / Out of scope. Build them in the order of the table below. Each ticket is one commit, made with `bash scripts/check.sh` green.

## Order and dependencies

| Order | Ticket | Finding | Depends on | Size |
|-------|--------|---------|------------|------|
| 1 | [S2c-01 — Block a week-start change once weeks are checked in](S2c-01-block-a-week-start-change-once-weeks-are-checked-in.md) | M1 | none | S |
| 2 | [S2c-02 — Reject a check-in position below the week's start](S2c-02-reject-a-check-in-position-below-the-weeks-start.md) | M2 | none | S |
| 3 | [S2c-03 — An invalid Custom width blocks Save](S2c-03-an-invalid-custom-width-blocks-save.md) | L1 | none | S |
| 4 | [S2c-04 — Don't save a loading or stale weight suggestion](S2c-04-dont-save-a-loading-or-stale-weight-suggestion.md) | L2 | none | S |
| 5 | [S2c-05 — Check-in polish: refresh the past weeks, one option on empty rows](S2c-05-check-in-polish.md) | L3, L5 | none | XS |
| 6 | [S2c-06 — Record progress on an assignment with nothing planned that week](S2c-06-record-progress-with-nothing-planned.md) | L4 | S2c-02, S2c-05 | M |

## Decisions

- **D25 (M1, DeeDee):** while any check-in or week review exists, the family's week start can't change. Answer 409 with a clear message, and show it in Settings. Stored weeks are never re-keyed.
- **D26 (M2):** a check-in position can't be below where that week started (`plannedFrom`, which already counts every earlier check-in). Answer 400. Recording repeated work ("we redid chapter 3") isn't supported: the position is how far the child got, not how much they did.
- **D27 (L4, DeeDee):** the last-week card has an "Add progress" option. It lists the child's active assignments with nothing planned that week. The parent sets where the child got to, with the week's start as the minimum. Going further than that is "ahead" and uses the usual ahead choice (thin the bars, or pull the end date in).
