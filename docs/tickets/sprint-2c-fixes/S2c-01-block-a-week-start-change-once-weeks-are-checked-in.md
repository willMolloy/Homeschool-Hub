# S2c-01 — Block a week-start change once weeks are checked in

**Finding:** M1  
**Depends on:** none  
**Size:** S

## Goal
A family that has saved any check-in or week review can't change its week start (**D25**, DeeDee: block, don't migrate). `PATCH /api/family` answers **409** with a clear message, and Settings shows it next to "Week starts on".

## Context
- Stored `progress_checkin.week_start` and `week_review.week_start` are keyed to the family's week start.
- After a change:
  - those weeks no longer line up, so the home card asks again;
  - the past-week list shows nothing;
  - the plan still applies the stored rows, with an internal `checkin-misaligned` warning.

## Steps
1. In `apps/api/src/routes/family.ts`, when the PATCH sends a `weekStart` that differs from the stored one, check for any `progress_checkin` or `week_review` row for the family. If there is one, throw `HttpError(409, "week_start_locked", "weekStart: the week start can't change after weeks have been checked in.")`.
   - Read and write in one transaction, locking the family row (`FOR UPDATE`), so a check-in saved at the same moment can't slip in between.
   - Sending the current value is still fine (a no-op).
   - Other fields in the same PATCH aren't saved when the week start is refused (the whole request fails).
2. Web (`FamilySettingsPage.tsx`): on a 409 `week_start_locked`, show the message under the "Week starts on" choices (`role="alert"`), not only at the top.
3. Add a hint under the choices: "Can't change after you've checked in a week."
   - Show it only when the API says the change is locked: `GET /api/family` gains `weekStartLocked: boolean`.

## Done when
- [ ] With a check-in or a review stored, a PATCH to the other week start returns 409 `week_start_locked`, and nothing changes.
- [ ] With neither stored, the change works as before.
- [ ] PATCHing the same week start, or another field, works with check-ins stored.
- [ ] Settings shows the message by the week-start choices, and the hint when locked.

## Tests
- `apps/api/test/family.test.ts`:
  - locked by a check-in;
  - locked by a review alone (a skipped week);
  - unlocked with neither;
  - same-value PATCH works;
  - `weekStartLocked` in GET.
- `apps/web/test`, the settings page: a 409 shows the message by the field; the hint shows when locked.

## Out of scope
- Re-keying stored weeks to a new week start (rejected by D25).
- A way to clear check-ins in order to unlock.
