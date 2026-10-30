# Sprint 3a progress — fast setup

Tickets: `docs/tickets/sprint-3a-setup/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3a-01 Copy an assignment from the Assignments screen | 251fe43 | `copyOf` on `ScheduleList` adds Copy to the edit form; `initial` prop on `AssignmentForm`; `copyOfAssignment` in `copyAssignment.ts` |
| S3a-02 Copy an assignment from the timeline edit bar | 153f663 | `onCopy` on `EditBar`; `initial` on `AddAssignmentSheet`; same `copyOfAssignment` prefill |
| S3a-03 Add the bulk-create assignments endpoint | 1ddad60 | `POST /api/assignments/bulk`; `createOne` shared with the single create |
| S3a-04 Add several assignments at once | (this commit) | `BulkAssignmentsForm`; `renderBulkForm` on `ScheduleList` adds the "Add several" button |

## Decisions (conservative calls on ambiguous points)

- **S3a-01 long titles.** When the title plus " (copy)" would pass 120 characters, the original is cut (trailing space dropped) so the copy still ends " (copy)" and is at most 120, rather than cutting the suffix off.
- **S3a-01 archived originals.** Copy also shows on the edit form of an archived assignment (next to Unarchive); the copy is a normal active assignment. If its subject is archived the form still lists that subject so the copy shows it.
- **S3a-01 where the prefill lives.** `ScheduleList` takes an optional `copyOf` and keeps the draft in state; `FormSlotProps` gained an optional `initial`. Only the Assignments screen passes `copyOf`, so days-off and events are unchanged.
- **S3a-02 after saving a copy.** It behaves exactly like "+ Add assignment" (the sheet closes, the plan refreshes, the selection clears and the new bar flashes) rather than selecting the new bar, since the ticket says "exactly like".
- **S3a-02 button placement.** Copy sits with the end-date steps in the edit bar (the row already wraps on 360 px; buttons keep their 44 px height). The header's "+ Add assignment" always opens an empty form, even after a cancelled copy.
- **S3a-02 existing test.** `timeline-edit-bar.test.tsx` lists the edit controls that must not exist until a bar is selected; "Copy" was added to that list.
- **S3a-03 error positions.** Validation errors (shape, limits, date order) and reference errors both get "Assignment N: " (1-based) in front of the usual message; the error codes (`invalid_request`, `invalid_range`, `invalid_reference`) are the single route's. The body-level errors (not a list, 0 or more than 50 items, unknown top-level key) have no prefix.
- **S3a-03 references per item.** `checkRefs` runs once per item inside the transaction (two small queries each, at most 50 items) so the messages match the single route's exactly; a failure rolls everything back, including earlier items.
- **S3a-03 limits.** Each item has the single create's limits; the whole request is capped at 50 items by the schema. The same child or subject in several items is fine.
- **S3a-04 what counts as an empty row.** A row with no title and no total (after trimming). A row with only one of them is validated, so the missing field shows its error.
- **S3a-04 server errors name the on-screen row.** The API counts only the rows sent ("Assignment 2: …"); the form rewrites that to "Row N: …" using the row's position on screen, so skipped empty rows don't shift the number. Other server messages show as they are (`saveError`).
- **S3a-04 rows.** At least one row always stays (Remove is hidden on the last one). Rows are grouped as "Row N" for screen readers; no visible row heading. Subject offers active subjects only, as the single Add form does. After saving, the first new card takes focus.
- **S3a-04 layout.** `.schedule-actions` is now a wrapping flex row so "Add several" sits beside "Add assignment"; a row's Remove sits under its fields.
