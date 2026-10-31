# Sprint 7 progress: setup and polish

Tickets: `docs/tickets/sprint-7-setup-polish/`. Pass A covers S7-01 to S7-05 (rollover, sibling reuse, custom zoom views). The other Sprint 7 tickets are a later pass.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S7-01 Copy a year's plan into a new year | 394470e | `CopyToNewYearPanel` (`schedule/CopyPanels.tsx`) in the Assignments `panels` slot; `copyPlan.ts` holds `shiftedCopy`, `copyCandidates` and the chunked bulk save |
| S7-02 Copy assignments to another child | a7c95aa | `CopyToChildPanel` (same file) reuses `CopyList`, `shiftedCopy` and `saveInChunks` |
| S7-03 Store a family's zoom views | (this commit) | Migration `014_zoom_views` (`family.zoom_views`); `http/zoomViews.ts` validates; `GET`/`PATCH /api/family` carry `zoomViews` |

## Decisions (conservative calls on ambiguous points)

- **S7-01 no default dates.** Both first days start empty (the app stores no school-year dates); nothing is listed until both are valid dates. A line says what to do, and that only the plan is copied.
- **S7-01 what is offered.** Non-archived assignments starting on or after this year's first day whose subject is active and that still have an active child. An archived child is dropped from the copy (as `copyOfAssignment` does); an assignment with only archived children, or an archived subject, is left out because the API would refuse it.
- **S7-01 grouping.** Grouped by the children an assignment is for ("Frank", "Maggie", or "Frank, Maggie" for a shared one) rather than splitting a shared assignment under each child, so it is ticked once. Rows are ordered by start date, then title.
- **S7-01 partly saved.** Chunks of 50 go one after another and stop at the first failure. Earlier chunks stay: they are added to the list through a new `onAdded` on the `panels` render prop (adds rows without closing the panel). The panel stays open, says "Part 2 of 2 didn't save: <title>: <message> 50 copies were created.", and offers only the assignments not yet copied, so Copy again never duplicates. The list of sources is fixed when the panel opens, so the copies just created are never offered.
- **S7-01 copied as stored.** `weightPerUnit` and `weekdays` are copied exactly (null stays null); title is unchanged (no " (copy)"), because the copies are for another year.
- **S7-02 the picks.** Copy from (active children), then an optional Subject (only the subjects that child has work in), the child's assignments ticked (all by default), Copy to (every active child except the source), and an optional New start date. Nothing is listed until a source is chosen; a child with nothing says so.
- **S7-02 the shift.** The new start date is where the earliest *ticked* assignment starts; the others keep their gaps from it (so unticking the first changes the base). With no date, dates are unchanged. The preview line under each title shows the new dates as the date is typed.
- **S7-02 shared assignments.** An assignment Frank shares with Maggie is listed under "Frank, Maggie" and copied for the target child alone. Copying to a child who already has the same work makes a second assignment (not checked for or blocked: the parent ticks what they want).
- **S7-02 same rules as S7-01.** Assignments with an archived subject or no active child are not offered; chunks of 50; a failed chunk keeps the earlier ones and a retry sends only the rest. Titles are unchanged (no " (copy)").
- **S7-03 migration number.** 014 (`db/014_zoom_views.sql`); `db/test/validate.sql`, `db/README.md` and `db/test/zoom-views-migration.test.ts` are in step. The database checks only the shape (an object with `hidden` and `custom` lists, never NULL; the default is `{"hidden":[],"custom":[]}`); the API checks the contents, as 012 does for templates.
- **S7-03 rules the API enforces.** `hidden` holds only fall, spring, month, each once (Year is not hideable); `custom` has at most 5 views, each `{ id (uuid), name (trimmed, 1 to 30), start, end }` with real dates (2000 to 2100), start on or before end, at most 400 days (exactly 400 is fine); ids are unique; shown total (1 for Year + built-ins not hidden + custom) at most 6. Unknown keys anywhere are refused. The order of `custom` is kept (S7-05 reorders it). The total message says how many would show ("You can show up to 6 views; this shows 8.").
- **S7-03 changed test expectations.** `GET /api/family` now also returns `zoomViews`, so four exact `toEqual` bodies (`family.test.ts` three, `tester2.schedule.test.ts` one) and the web fixture `SETTINGS` in `settings-form.test.tsx` gain `zoomViews: { hidden: [], custom: [] }`; the fake API's allowed keys for `PATCH /api/family` gain `zoomViews`. Nothing else changed.
