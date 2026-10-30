# Sprint 3a progress — fast setup

Tickets: `docs/tickets/sprint-3a-setup/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3a-01 Copy an assignment from the Assignments screen | 251fe43 | `copyOf` on `ScheduleList` adds Copy to the edit form; `initial` prop on `AssignmentForm`; `copyOfAssignment` in `copyAssignment.ts` |
| S3a-02 Copy an assignment from the timeline edit bar | 153f663 | `onCopy` on `EditBar`; `initial` on `AddAssignmentSheet`; same `copyOfAssignment` prefill |
| S3a-03 Add the bulk-create assignments endpoint | 1ddad60 | `POST /api/assignments/bulk`; `createOne` shared with the single create |
| S3a-04 Add several assignments at once | a67fe2c | `BulkAssignmentsForm`; `renderBulkForm` on `ScheduleList` adds the "Add several" button |
| S3a-05 Parse an assignments CSV | 6844467 | `csvImport.ts`: `parseAssignmentsCsv`, `errorText`, `assignmentsCsvTemplate`; limits moved to `assignmentLimits.ts` |
| S3a-06 Import assignments from a CSV | (this commit) | `ImportAssignmentsForm`; "Import CSV" button via `renderImportForm` on `ScheduleList` |

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
- **S3a-05 limits file.** The module may depend only on engine constants, so `LIMITS` moved unchanged from `AssignmentsPage.tsx` to `assignmentLimits.ts` (re-exported from the page), with the API's 2000–2100 year range added. The parser does its own checks rather than importing `formBits` (which pulls in React).
- **S3a-05 all or nothing.** Any error returns `rows: []`, so a caller can't import part of a file by mistake. Every error in the file is listed, and one bad row can give several errors (one per broken rule), all with that row's line.
- **S3a-05 the 50-row cap.** More than 50 non-blank data rows gives the single error "Import at most 50 assignments at a time." with `line: 0` (the whole file); `errorText` shows lines as "Line N: …" and line 0 without a prefix.
- **S3a-05 header.** Extra columns are ignored; a repeated column uses its first copy; a missing column is one error on line 1. Only commas separate fields (children use `;`).
- **S3a-05 matching.** Subject and child names match active rows only, case-insensitively and trimmed (the first of two same-named rows wins); the same child named twice is used once. Unit accepts singular or plural. Dates also need a real calendar date in 2000–2100, as the API does. Quoted fields may hold line breaks; line numbers are the physical line a record starts on.
- **S3a-05 template.** `assignmentsCsvTemplate` is the header plus one example row built from the family's first active subject and child (Math / Ada when there are none), so it imports as is.
- **S3a-06 one open panel.** `ScheduleList` now tracks which multi-row form is open (`panel`: "Add several" or "Import CSV"), so the two never show together and the single Add form and each panel exclude each other.
- **S3a-06 the template link.** A `data:` URL with `download="assignments-template.csv"` (no server round trip), built from `assignmentsCsvTemplate` with the family's own names.
- **S3a-06 preview.** Valid: "N assignments" and a list (title, then subject · children · dates). Any error: only the error list ("Line N: …"), no count. The file's text is also put in the paste box, so the parent can fix and re-check it in place. Import stays disabled with no text.
- **S3a-06 server errors.** "Assignment N: …" from the API is rewritten to the Nth parsed row's title; the rest of the message is shown as `saveError` leaves it. The preview and Import stay available to retry.
