# Sprint 2c progress — fixes from the sprint 2b verification

Tickets: `docs/tickets/sprint-2c-fixes/`. Findings: `docs/reviews/sprint-2b-verification.md`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| Tickets S2c-01..06 | f16760d | |
| S2c-01 Block a week-start change once weeks are checked in (M1) | ce2980e | 409 `week_start_locked`; `weekStartLocked` on GET/PATCH; UI hint + inline error |
| S2c-02 Reject a check-in position below the week's start (M2) | b63324a | 400 below `plannedFrom`; number field min = slider min |
| S2c-03 An invalid Custom width blocks Save (L1) | (this commit) | `onValidityChange` on the picker; `RosterForm.blocked`; caption while invalid |

## Decisions (conservative calls on ambiguous points)

- **S2c-01 lock scope.** Any stored `progress_checkin` or `week_review` row locks the week start, including a week saved as "skipped" or "went as planned" (a review with no items) — those rows are keyed by the old week start too.
- **S2c-01 concurrency.** PATCH /api/family runs in one transaction holding the family row `FOR UPDATE`; `saveWeek` takes `FOR SHARE` on the same row first, so a week-start change and a first check-in can't interleave.
- **S2c-01 whole request refused.** A PATCH that changes the week start while locked fails as a whole (other fields in the same body are not saved), matching how every other validation error behaves. A same-value `weekStart` is accepted.
- **S2c-01 UI.** When locked, the Week starts on choices are disabled with the hint (rather than only failing on Save). A 409 from a stale page shows the message under the choices, resets the selection and switches to the locked state.
- **S2c-01 web types.** `FamilySettings` (responses) carries `weekStartLocked`; the PATCH body uses the separate `FamilySettingsPatch`, so the flag can never be sent (the API body schema is strict).
- **S2c-01 tester test.** `apps/api/test/tester2.schedule.test.ts` had an exact `toEqual` on GET /api/family; it now includes `weekStartLocked: false` (the only change to that file).
- **S2c-02 the bound is the rounded `plannedFrom`.** `checkItem` compares against the same 2-decimal `plannedFrom` the GET returns, so the client's minimum and the API's always agree (a position equal to it saves).
- **S2c-02 stale stored rows.** A stored week whose position is now below its `plannedFrom` (after an earlier week was edited) is left as stored; re-saving it with that value is refused with the new minimum named, so the parent sees it when they edit that week. Re-validating later weeks automatically is out of scope (ticket).
- **S2c-03 the assignment form doesn't use the picker.** It has its own weight number field (S2b-10), which already refuses 0, negatives, over 100 and more than 2 decimals on Save with no request (`assignments-screen.test.tsx`, "weight %s → client error, no request"). An empty field there is valid by design (it means "use the subject's default or the built-in"), so nothing changed in that form.
- **S2c-03 how Save is blocked.** `RosterForm` gained a generic `blocked` prop (disables Save and ignores submit) rather than knowing about weights; `SubjectForm` sets it from the picker's validity. A unit change resets the picker to None, which counts as valid.
