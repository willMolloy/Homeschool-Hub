# Sprint 5 progress — event preview, calendar templates and the phone pass

Tickets: `docs/tickets/sprint-5-preview-templates-phone/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S5-01 Add the event preview endpoint | 297ffcb | `POST /api/plan/preview-event` in `routes/eventPreview.ts`; the event create schema is exported from `events.ts` and reused |
| S5-02 Show the plan change before saving an event | d7855ed | `EventPreview.tsx` (`useEventPreview`, `EventPreviewList`); the form's checks are one `check()` shared by the preview and Save |
| S5-03 Add year-shape helpers | 3a57d34 | `yearShape.ts`: `usHolidays`, `onOffBreaks`, `CALENDAR_SHAPES`; exported from `@hh/engine` |
| S5-04 Add the bulk-create days off endpoint | (this commit) | `POST /api/blocked-ranges/bulk` in `blockedRanges.ts`; `createOne` and `atPosition` shared with the single create |

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
- **S5-03 holiday shape.** Each holiday is `{ key, start, end, label }` (the ticket asks for `{ start, end, label }` plus a stable key). Keys: `labor-day`, `thanksgiving`, `winter-break`, `mlk-day`, `presidents-day`, `good-friday`, `memorial-day` (`HOLIDAY_KEYS`). Thanksgiving is one entry, Thursday to Friday. Results are in date order.
- **S5-03 "in range".** A holiday is returned when any of its days falls in `[start, end]`, and it is cut to the range, so a template never adds days outside the school year (a winter break running past the last day ends on that day; a range starting on Jan 1 still gets that day of last year's break). Good Friday comes from the Gregorian Easter algorithm in integer arithmetic.
- **S5-03 break runs.** `onOffBreaks` returns one range per run of break weeks (2 weeks off is one 14-day range, first day of the first week to last day of the last), not one per week, because a parent sees it as one break. The range is whole weeks, so it includes the weekend; the last is cut at `end`. A break that would start after `end` is dropped. `weeksOn` below 1 or `weeksOff` below 0 (or not whole) throws `EngineInputError`; `weeksOff` 0 gives none.
- **S5-03 shapes as data.** `CALENDAR_SHAPES`: `36-weeks` (pattern null, holidays only), `sabbath` (6 on, 1 off), `three-terms` (12 on, 2 off), each with a label for the screen.
- **S5-03 no version bump.** Only new exports and no plan number changes, as in S4-08, so `ENGINE_VERSION` stays 0.9.0.
- **S5-04 how.** Same pattern as S3a-03: every item is parsed with the create schema and date-checked first (errors read "Day off N: ..."), then one transaction creates them in order with the single create's own `createOne` (reference check included, so one foreign child id rolls everything back). 201 returns the rows in request order. Body `{ blockedRanges: [...] }`, 1 to 100 items, strict. `kind` defaults to `vacation` per item, as in the single create. Like the single create, it has no demo-family block.
