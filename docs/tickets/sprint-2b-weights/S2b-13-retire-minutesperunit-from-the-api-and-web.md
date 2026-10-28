# S2b-13 — Retire minutesPerUnit from the API and web

**Depends on:** S2b-10, S2b-11, S2b-12  
**Size:** XS

## Goal
`minutesPerUnit` is gone from requests and responses: an unknown key → 400, like any other (RF-09).

## Steps
1. `routes/assignments.ts`: delete the legacy alias and its TODO. The strict schemas then reject `minutesPerUnit` with the standard unknown-key message.
2. `assignmentRepo`:
   - `toAssignmentJson` drops `minutesPerUnit`.
   - Stop selecting and writing `minutes_per_unit`.
   - The column stays in the DB until S2b-15, so a rollback of this commit still works.
3. `loadPlanInputs` stops mapping `minutesPerUnit`.
4. Web: remove `minutesPerUnit` from `api/types.ts`, `DEMO_*` fixtures and `BODY_KEYS`.
5. `http/scheduleLimits.ts`: delete `MinutesPerUnit` and `MAX_MINUTES_PER_UNIT`.

## Done when
- [ ] `rg -n "minutesPerUnit|minutes_per_unit" apps` finds only the 400 test.

## Tests
- `strict-input.test.ts`: POST and PATCH with `minutesPerUnit` → 400 naming it.
- The fake API self-test flags `minutesPerUnit`.

## Out of scope
- The engine fields (S2b-14) and the column (S2b-15).
