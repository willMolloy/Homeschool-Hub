# Handoff (2026-11-03)

Where Homeschool Hub stands, for whoever picks it up next (Product Owner, Developer or Tester).

## State

- **Branches:** `hh2/sprint-10` (Sprint 10 tickets only, see below). Sprint 9 and 9b code is on `hh2/sprint-9b`, started from `claude/test-coverage-analysis-6dehbu` (it holds Sprint 9 and Sprint 9b).
  https://github.com/willMolloy/Homeschool-Hub/tree/hh2/sprint-9b
- **`main` has neither Sprint 9 nor 9b yet.** No PR is open. Per the branch rule in [../HOW_WE_WORK.md](../HOW_WE_WORK.md#branches) (decided by DeeDee, 2026-11-03), the PR to `main` comes only after the sprint passes testing.
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

## What's next, in order

1. **S9b-06: the independent re-test** (`docs/tickets/sprint-9b-fixes/S9b-06-retest.md`). The Tester, not the Developer, re-checks N1–N17 and S9-05 in a browser:
   - at 320, 360, 390 and 1280 px, in light and dark;
   - plus the smoke scenarios and the gate.
   - The results go in a "Re-test (S9b-06)" section of `docs/reviews/sprint-9-verification.md`.
   - Things the Developer could not check:
     - the CSV byte-order mark in Excel (N14);
     - dark theme and forced-colours look of the new switch (N15). The 320 px checks were made in Chrome on a throwaway page only.
2. **The Sprint 9 + 9b PR to `main`**, once the re-test passes. It is one PR from `hh2/sprint-9b`, with no force-push. DeeDee approves the merge.
3. **Sprint 10: Year view polish.** The tickets are ready (updated 2026-11-03 with DeeDee's decisions) in `docs/tickets/sprint-10-year-polish/` on branch **`hh2/sprint-10`**: https://github.com/willMolloy/Homeschool-Hub/tree/hh2/sprint-10
   - It was cut from `hh2/sprint-9b` before the re-test, and holds only docs so far.
   - Once the Sprint 9 + 9b PR lands, merge `main` into it (no force-push, so no rebase of the pushed branch), then build in the README's order.
   - The README lists the PO's conservative calls for DeeDee to confirm.
   - **Leave the re-test's file to the Tester.** The re-test's only push is `docs/reviews/sprint-9b-verification.md` on `hh2/sprint-9b`; bring it across when rebasing or merging.

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
