# Sprint 5 progress — event preview, calendar templates and the phone pass

Tickets: `docs/tickets/sprint-5-preview-templates-phone/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S5-01 Add the event preview endpoint | 297ffcb | `POST /api/plan/preview-event` in `routes/eventPreview.ts`; the event create schema is exported from `events.ts` and reused |
| S5-02 Show the plan change before saving an event | (this commit) | `EventPreview.tsx` (`useEventPreview`, `EventPreviewList`); the form's checks are one `check()` shared by the preview and Save |

## Decisions (conservative calls on ambiguous points)

- **S5-01 validation.** The draft is parsed with the create route's own schema (exported `CreateBody`, so the two cannot drift), plus the same date-order check and reference check. With `eventId`, children already linked to that event may stay even if archived since (as the edit route allows); new ones must be active. The demo family is not blocked: nothing is written.
- **S5-01 archived children.** As in `loadPlanInputs`, archived children drop out of the draft; a draft whose children are all archived is left out of the "after" plan rather than becoming a whole-family event.
- **S5-01 what counts as a change.** `perDay` is the plan's `rate` rounded to one decimal, so a row appears when the two rounded values differ or the end moves; a change too small to show as a different number is left out. `end` is the plan's effective `end`.
- **S5-01 ordering.** Relative change is the larger of (change in `rate` / the old `rate`, at least 0.1) and (days the end moves / days from today to the old end). Ties sort by title, child name, then ids.
- **S5-01 asOf and drafts.** Today is the family's today (the app clock). A draft for a new event gets the id `preview`; an edit takes the stored event's id and replaces it (an archived stored event is simply not in the "before" plan).
- **S5-02 when it asks.** Only while the whole form is valid (the same checks Save runs, now one `check()` in the form, so the two cannot disagree). A name is needed, so nothing shows until the event is named and has a day. When the form turns invalid the list disappears. The request goes 400 ms after the last change to anything in the sent body, with `eventId` on an edit; an older answer never replaces a newer one.
- **S5-02 the list.** Under the capacity field, after all the rules: a "What changes" title and plain list, no box or icon. The unit is singular only when the new amount is exactly 1 ("1 lesson a day"). "and N more" counts the rows hidden past 5 plus the server's own `more`. While a new answer loads the old list stays; an error (or a 401/404) clears it and Save is unaffected, as it never waits for the preview.
- **S5-02 changed test helper.** `writes()` in `schedule-fixtures.ts` now leaves out the preview POST, since it only reads; otherwise every existing event-form test would count it as a write. The fake API's allowed body keys gained the preview's (`event`, `eventId`).
- **S5-02 not checked.** 360 px layout is a plain list with wrapping text (jsdom has no layout, so it was not measured).
