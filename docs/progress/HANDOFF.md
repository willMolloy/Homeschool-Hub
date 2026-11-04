# Handoff (2026-11-03)

Where Homeschool Hub stands, for whoever picks it up next (Product Owner, Developer or Tester).

## State

- **Sprint 9 and 9b are merged to `main`:** [PR #4](https://github.com/willMolloy/Homeschool-Hub/pull/4), "Sprint 9 + 9b: Schedule & Records, plus fixes", merged on 2026-11-03 with a merge commit (the same method as PR #3).
  - The merge commit is `bd47c550f4c92c3cb0fc4e8ff5baf0447364d5a8`.
  - CI passed on the head, `e8dab0d`.
  - The re-test (`docs/reviews/sprint-9b-verification.md`) said READY: no High or Medium findings, and 7 Low ones (R1–R7).
- **Branches:**
  - Work now continues on `hh2/sprint-10`, which has `main` merged in: https://github.com/willMolloy/Homeschool-Hub/tree/hh2/sprint-10
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

## What's next, in order

1. **Sprint 10: Year view polish, built on `hh2/sprint-10`.**
   - The tickets are ready in `docs/tickets/sprint-10-year-polish/`. They were updated 2026-11-03 with DeeDee's decisions.
   - Build in the README's order.
   - The README lists the PO's conservative calls for DeeDee to confirm.
   - The 9b re-test's Low findings are carried over:
     - **S10-19** covers R1, R2, R5 and R7;
     - the S10-10 tester checks R3, R4 and R6.
2. **The Sprint 10 tester pass (S10-10)**, then a Sprint 10 PR to `main` once it passes, as with PR #4.

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
- `test/timeline-add.test.tsx` ("on save, closes, draws the new bar…") failed once in a full gate run during S9b-05 and passed alone and on the rerun. It looks timing-sensitive, so watch for it.
