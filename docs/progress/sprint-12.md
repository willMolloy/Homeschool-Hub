# Sprint 12 progress: "Did Frank finish…?" and the needs-you dot

Tickets: `docs/tickets/sprint-12-completion/` (the README has Will's decisions of 2026-11-04 and 2026-11-05 and the build order). Branch `claude/test-coverage-analysis-6dehbu`, one commit per ticket, each pushed as soon as `bash scripts/check.sh` ends ALL GREEN. S12-08 (the tester pass) is the tester's. Screens are in `screens/sprint-12/`.

**Build order (README):** S12-01 to S12-07, then S12-09, then S12-08 (tester).

| Ticket | Commit | Notes |
|--------|--------|-------|
| S12-01 Store how an assignment ended | 39e093b | **DB:** `024_assignment_ended` adds `assignment.ended_as` (`finished` / `stopped`, NULL while open) and `ended_on` (date), both or neither (`assignment_ended_pair`); existing rows stay open. **API:** the assignment JSON carries `endedAs` and `endedOn` (null while open). `PATCH /api/assignments/:id` takes `endedAs` (`finished` / `stopped` / `null` to reopen) and `endedOn`: finished defaults to the stored end date, stopped to today in the family's zone (never before the start), `endedOn` alone moves the day of one already ended (400 for an open one), `endedAs: null` with a day is a 400; an assignment can't end before it starts (400 `invalid_range`), and a later start can't pass the day it ended. It is one more plan change, so the existing undo covers it with its own labels ("Marked Treasure Island finished", "…stopped", "Reopened Treasure Island"); `AssignmentState` carries both fields. `loadPlanInputs` reads them into the engine's `Assignment` (`endedAs?`, `endedOn?`, ignored until S12-04). Logging is untouched (no log or record row is written). **Web:** the `Assignment` type has both fields, optional so older fixtures still type. Tests: `apps/api/test/s12-01-assignment-ended.test.ts` (11), `db/test/assignment-ended-migration.test.ts` (3), `validate.sql`. **Changed expectations:** `assignments-create`, `assignments-bulk` and `assignments-list` tests list `endedAs` / `endedOn` in the assignment shape |
| S12-02 Which assignments are waiting for an answer | (this commit) | **Web** (`features/completion/waiting.ts`): `isWaiting(a, today)` is the one rule (not archived, no `endedAs`, `endDate` before today; an answer from an older API with no ended fields reads as open); `todayOf(me)` is the family's day from `/api/me` (the device's day only if that is not a date); `waitingQuestions(assignments, children, today)` returns the waiting ones oldest end first (ties by title, then id), each with the active children on it in roster order and the words "Did Frank, Margaret and Leo finish History spine?" (`joinNames`: "A", "A and B", "A, B and C"). An assignment whose only children are archived is not asked about (the plan leaves it out too). Moving the end later takes it off the list until the new end passes. **Demo seed:** `db/seed.ts` writes `ended_as` / `ended_on` from a seed assignment; the demo family marks Aesop's Fables, Treasure Island and Times tables finished (on their end dates), so on Nov 4, 2026 the one question is "Did Margaret finish A Child's Garden of Verses?" (ended Oct 30; S12-07 step 2 asks for exactly this). Tests: `s12-02-waiting.test.ts` (12: today, yesterday, tomorrow, archived, answered, older answer, moved end, the family's day, names, order, archived children, the demo). **Changed expectations:** none |

## Decisions

- **S12-01 the day is validated against the start, not the end:** finished can have `endedOn` before the planned end (finished early) or after it (finished late); only "before the start" is refused.
- **S12-01 stopped with no day is today, or the start if that is later** (a parent stopping next year's book): never a day before the start.
- **S12-02 the demo's older books are marked finished, not a new assignment added:** the demo's Aug–Oct books all ended before Nov 4, so left open they would all be questions; answering the old ones keeps "exactly one waiting" true, with the poems (Margaret) as the one that ended last week.
- **S12-02 a family with an assignment whose children are all archived gets no question,** so the dot never lights for something the parent cannot answer sensibly.
- **S12-01 the engine fields are added now** (as inputs, unused) so the plan input is read in this ticket, as its step 2 says; the plan changes in S12-04.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S12-01 | 420 | 1095 | 1384 | 163 |
| S12-02 | 420 | 1095 | 1396 | 163 |
