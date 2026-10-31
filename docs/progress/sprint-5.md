# Sprint 5 progress — event preview, calendar templates and the phone pass

Tickets: `docs/tickets/sprint-5-preview-templates-phone/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S5-01 Add the event preview endpoint | (this commit) | `POST /api/plan/preview-event` in `routes/eventPreview.ts`; the event create schema is exported from `events.ts` and reused |

## Decisions (conservative calls on ambiguous points)

- **S5-01 validation.** The draft is parsed with the create route's own schema (exported `CreateBody`, so the two cannot drift), plus the same date-order check and reference check. With `eventId`, children already linked to that event may stay even if archived since (as the edit route allows); new ones must be active. The demo family is not blocked: nothing is written.
- **S5-01 archived children.** As in `loadPlanInputs`, archived children drop out of the draft; a draft whose children are all archived is left out of the "after" plan rather than becoming a whole-family event.
- **S5-01 what counts as a change.** `perDay` is the plan's `rate` rounded to one decimal, so a row appears when the two rounded values differ or the end moves; a change too small to show as a different number is left out. `end` is the plan's effective `end`.
- **S5-01 ordering.** Relative change is the larger of (change in `rate` / the old `rate`, at least 0.1) and (days the end moves / days from today to the old end). Ties sort by title, child name, then ids.
- **S5-01 asOf and drafts.** Today is the family's today (the app clock). A draft for a new event gets the id `preview`; an edit takes the stored event's id and replaces it (an archived stored event is simply not in the "before" plan).
