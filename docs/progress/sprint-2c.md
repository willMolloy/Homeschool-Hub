# Sprint 2c progress — fixes from the sprint 2b verification

Tickets: `docs/tickets/sprint-2c-fixes/`. Findings: `docs/reviews/sprint-2b-verification.md`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| Tickets S2c-01..06 | f16760d | |
| S2c-01 Block a week-start change once weeks are checked in (M1) | ce2980e | 409 `week_start_locked`; `weekStartLocked` on GET/PATCH; UI hint + inline error |
| S2c-02 Reject a check-in position below the week's start (M2) | b63324a | 400 below `plannedFrom`; number field min = slider min |
| S2c-03 An invalid Custom width blocks Save (L1) | 6df8659 | `onValidityChange` on the picker; `RosterForm.blocked`; caption while invalid |
| S2c-04 Don't save a loading or stale weight suggestion (L2) | 8b3a927 | hook returns `{ suggestion, pending }`; Add/Save disabled + `aria-busy` while following a pending suggestion |
| S2c-05 Check-in polish (L3, L5) | 3ae0067 | `checkInsVersion`/`checkInsSaved` in the plan-refresh context; PastWeeks refetches on it; one "Nothing planned" chip on empty rows |
| S2c-06 Record progress on an assignment with nothing planned (L4) | 6346256 | GET adds `addable`; PUT accepts those pairs; "Add progress" on the card (`AddProgress`), removable added rows |

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
- **S2c-04 the label.** The button keeps its usual label while waiting ("Add" on the add form, "Save" when editing after a unit change); the ticket's "keeps the label Save" is read as "keeps its label", not as renaming Add.
- **S2c-04 what counts as pending.** Pending means the last answer's request path differs from the current one (unit, sorted children, subject), so reordering the same children is not a new input and the debounce counts as pending. Changing only the subject re-asks too, because a subject default can change the suggestion.
- **S2c-04 only an untouched suggestion waits.** A typed weight (or a cleared field) doesn't depend on the suggestion, so it can save while one is loading. Editing an assignment without changing its unit makes no request and is never pending.
- **S2c-05 one refresh path.** The past-week editor's own `onSaved={api.reload}` was removed (and with it the hook's `onSaved` parameter, which had no other user): every save, from the editor or the home card, now goes through `checkInsSaved`, so the list refetches exactly once per save.
- **S2c-05 Finished it on an empty row.** The existing rule (the total within two weeks' planned work) is kept unchanged; with nothing planned that week it never applies, so an empty row shows only "Nothing planned". The number field still accepts any position up to the total.
- **S2c-06 which pairs are addable.** Loader-planned (active, not archived) pairs with no planned work and no stored row that week, with work left (`plannedFrom` below the total), in a week the engine would apply a check-in to: not entirely before the start, and not after both the end date and the plan's own end (the engine's `checkin-outside-range`). Anything else in a PUT is still `invalid_reference`. A stored unplanned row comes back in `items` (with `plannedFrom = plannedTo`), not in `addable`.
- **S2c-06 `addable` is always present.** The field is required on the response (an empty list when there is nothing to add), so the web type is required too; the test fixtures that build a `WeekCheckIn` gained `addable: []`.
- **S2c-06 ordering in the add list.** The list keeps the API's child order and sorts by title within a child (the ticket's "child, then title"); the API's own `addable` order is child, subject, title like `items`.
- **S2c-06 where added rows go.** An added row joins its child's group after that child's planned rows; its label is "<title> — nothing planned" (a stored unplanned row reopened in edit mode reads the same). Only rows added in this session have Remove; a stored unplanned row is cleared by putting it back to its start (Save replaces the week, as before).
- **S2c-06 prompt mode.** The home card still hides when last week had no planned rows, even if pairs are addable (ticket); those weeks are reachable from Review a past week.
