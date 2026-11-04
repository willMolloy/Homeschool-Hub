# Sprint 12 progress: "Did Frank finish…?" and the needs-you dot

Tickets: `docs/tickets/sprint-12-completion/` (the README has Will's decisions of 2026-11-04 and 2026-11-05 and the build order). Branch `claude/test-coverage-analysis-6dehbu`, one commit per ticket, each pushed as soon as `bash scripts/check.sh` ends ALL GREEN. S12-08 (the tester pass) is the tester's. Screens are in `screens/sprint-12/`.

**Build order (README):** S12-01 to S12-07, then S12-09, then S12-08 (tester).

| Ticket | Commit | Notes |
|--------|--------|-------|
| S12-01 Store how an assignment ended | (this commit) | **DB:** `024_assignment_ended` adds `assignment.ended_as` (`finished` / `stopped`, NULL while open) and `ended_on` (date), both or neither (`assignment_ended_pair`); existing rows stay open. **API:** the assignment JSON carries `endedAs` and `endedOn` (null while open). `PATCH /api/assignments/:id` takes `endedAs` (`finished` / `stopped` / `null` to reopen) and `endedOn`: finished defaults to the stored end date, stopped to today in the family's zone (never before the start), `endedOn` alone moves the day of one already ended (400 for an open one), `endedAs: null` with a day is a 400; an assignment can't end before it starts (400 `invalid_range`), and a later start can't pass the day it ended. It is one more plan change, so the existing undo covers it with its own labels ("Marked Treasure Island finished", "…stopped", "Reopened Treasure Island"); `AssignmentState` carries both fields. `loadPlanInputs` reads them into the engine's `Assignment` (`endedAs?`, `endedOn?`, ignored until S12-04). Logging is untouched (no log or record row is written). **Web:** the `Assignment` type has both fields, optional so older fixtures still type. Tests: `apps/api/test/s12-01-assignment-ended.test.ts` (11), `db/test/assignment-ended-migration.test.ts` (3), `validate.sql`. **Changed expectations:** `assignments-create`, `assignments-bulk` and `assignments-list` tests list `endedAs` / `endedOn` in the assignment shape |

## Decisions

- **S12-01 the day is validated against the start, not the end:** finished can have `endedOn` before the planned end (finished early) or after it (finished late); only "before the start" is refused.
- **S12-01 stopped with no day is today, or the start if that is later** (a parent stopping next year's book): never a day before the start.
- **S12-01 the engine fields are added now** (as inputs, unused) so the plan input is read in this ticket, as its step 2 says; the plan changes in S12-04.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S12-01 | 420 | 1095 | 1384 | 163 |
