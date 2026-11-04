# Handoff (updated 2026-11-04)

Where Homeschool Hub stands, for whoever picks it up next (Product Owner, Developer or Tester).

## State

- **Sprint 9 and 9b are merged to `main`:** [PR #4](https://github.com/willMolloy/Homeschool-Hub/pull/4), "Sprint 9 + 9b: Schedule & Records, plus fixes", merged on 2026-11-03 with a merge commit (the same method as PR #3).
  - The merge commit is `bd47c550f4c92c3cb0fc4e8ff5baf0447364d5a8`.
  - CI passed on the head, `e8dab0d`.
  - The re-test (`docs/reviews/sprint-9b-verification.md`) said READY: no High or Medium findings, and 7 Low ones (R1–R7).
- **Branches:**
  - Work now continues on `hh2/sprint-10` (the Sprint 10a branch), which has `main` merged in: https://github.com/willMolloy/Homeschool-Hub/tree/hh2/sprint-10
  - `hh2/sprint-9b` is kept, but it is done.
  - The branch rule is in [../HOW_WE_WORK.md](../HOW_WE_WORK.md#branches) (decided by DeeDee, 2026-11-03).
- **Gate:** `bash scripts/check.sh` was ALL GREEN before every Sprint 9b commit.

## Done: Sprint 9b (fixes from the S9-10 test)

Details, files and Decisions are in [sprint-9.md](sprint-9.md) under "Sprint 9b". Tickets: `docs/tickets/sprint-9b-fixes/`.

| Ticket | Commit | In short |
|--------|--------|----------|
| S9b-01 School days are real days | 0a31fc7 | An entry's days come from the calendar (school weekdays less days off); ranges count the part inside them. |
| S9b-02 A typed book is never dropped | 426985e | A title typed but not added is added on Save. |
| S9b-03 Home's "on track" is honest | db6bdf0 | The Schedule card says "running late" when any work is forecast late. |
| S9b-04 Smoke scenarios use the DateField | 6e9c58b | Scenarios type US dates. They pass against a private local stack. |
| S9b-05 Small fixes from the Sprint 9 tester | 3a247ae | N6, N7, N9–N17 and the demo's late assignment (S9-05). |
| S9b-06 Independent re-test | e8dab0d | READY. 18 of 18 pass, 23 of 23 smoke scenarios, and 7 Low findings (R1–R7). See `docs/reviews/sprint-9b-verification.md`. |

## Now: Sprint 10a (the Year view) on `hh2/sprint-10`

- **The split (DeeDee, 2026-11-04).** Sprint 10 is now two sprints; see `docs/tickets/sprint-10-year-polish/README.md#order`.
  - **10a** is the Year view: S10-01 to S10-08, S10-04b, S10-04c and S10-15, then the S10-10a tester pass. It is built on `hh2/sprint-10`, which is the 10a branch.
  - **10b** is colours, navigation and the wide layout: S10-09, S10-11 to S10-14, S10-16 to S10-19 and S9b-07, then the S10-10b tester pass. It gets its own branch off `main` after 10a merges. **Don't start 10b on `hh2/sprint-10`.**
- **Progress:** per-ticket rows and Decisions are in [sprint-10.md](sprint-10.md). Done and pushed so far:

| Ticket | Commit |
|--------|--------|
| S10-01 Sheets above the tab bar | bea44b8 |
| S10-02 Lanes grouped by child | fa80631 |
| S10-15 Year badges 44 px tap zone | e631c61 |
| S10-03 Sticky two-line axis | 51cef65 |
| S10-04 Bar heights follow effort (95th-percentile max) | b5f33d1 |
| S10-04b Bar labels that fit | 9cd926c |
| S10-04c 44 px tap zones on thin bars | see sprint-10.md |

- **Next:** S10-05, S10-06, S10-07 and S10-08. Then stop, and the S10-10a tester takes over. If time runs short, S10-08 slips first, then S10-07 (README).
- **Gate:** before every commit, `DATABASE_URL=postgres://hh:hh@127.0.0.1:5462/hh2dev_test bash scripts/check.sh` must end ALL GREEN (about 2 minutes).
  - That Postgres is the Developer's own embedded one on 127.0.0.1:5462 (data in `/workspace/hh2-s10-pg/data`, binaries under `/workspace/hh2-s10-pg/node_modules/@embedded-postgres/linux-x64/native/bin`, user hh/hh). Start it with `pg_ctl -D /workspace/hh2-s10-pg/data -o "-p 5462 -c listen_addresses=127.0.0.1 -k /workspace/hh2-s10-pg/sock" start` if it is down; any scratch Postgres with an empty test database works too.
- **In progress:** nothing half-done. Each ticket is one commit.

## S9b-07 and Claude's branch

- The ticket `docs/tickets/sprint-9b-fixes/S9b-07-runs-show-day-chips.md` and its README row were copied from `origin/claude/test-coverage-analysis-6dehbu` (commit `0d2e95d`). The rest of that branch was **not merged**.
- That branch's S9b-01 to S9b-04 commits (`d329548`, `400a1d9`, `308339d`, `375d3e0`) are Claude's parallel versions. They are superseded by ours, which are on `main` via PR #4. Don't merge them.
- Future work branches from `main`, per the one-branch-per-sprint rule in [HOW_WE_WORK](../HOW_WE_WORK.md#branches).
- **S9b-07 is in Sprint 10b** (2026-11-04). It is not built on `hh2/sprint-10`. Build it adapted to our S9b-01, where an entry's days are the calendar's school weekdays less days off. The S10-10b tester checks it.

## What's next, in order

1. **Finish Sprint 10a**, then the S10-10a tester pass, then a Sprint 10a PR to `main` once it passes, as with PR #4.
2. **Sprint 10b** on a new branch off `main`, then the S10-10b tester pass and its PR.

## Open for DeeDee

- **The [ROADMAP.md](../ROADMAP.md) checklist is stale.** Several items built in earlier sprints are still unticked, for example:
  - the weekly briefing;
  - undo and reset;
  - adjusting a week;
  - custom zoom views.

  It was left alone on purpose, pending DeeDee's decision on how it should be updated.

## Notes for the next session

- The new-session checklist in HOW_WE_WORK now points to [sprint-9.md](sprint-9.md) and this file.
- Shared machine: other agents may run servers on :5173, :3000, :5273 and :3100. Leave them alone, and use other ports for a private stack bound to 127.0.0.1.
- Tester notes for 10a are in S10-10a: All children against one child side by side (the bars rescale, which is expected); a 3-child family with overlapping books at 390 px; a badge's tap zone wins over a bar's at the plot's left edge.
- `test/timeline-add.test.tsx` ("on save, closes, draws the new bar…") failed once in a full gate run during S9b-05 and passed alone and on the rerun. It looks timing-sensitive, so watch for it.
