# S3a-04 — Add several assignments at once

**Source:** ROADMAP.md, "Fast setup" (bulk-add)  
**Depends on:** S3a-03  
**Size:** M

## Goal
On the Assignments screen, a parent can enter several assignments for one subject in one form (shared subject, children, dates and unit, then one row per book with a title and total) and save them all together.

## Context
- The common case is a term's books for one subject, read over the same dates (for example several Charlotte Mason books for one child).
- `formBits.tsx` has the shared pieces (`ChildPicker`, `dateRangeError`, `parsePositive`, `saveError`). Client limits are `LIMITS` in `AssignmentsPage.tsx`.

## Steps
1. Next to "Add assignment", add **Add several**.
2. The form has the shared fields (subject, children, start, end, unit) and a list of rows, each with **Title** and **Total**. It starts with 3 empty rows; "Add row" adds one; each row can be removed.
3. Rows that are completely empty are ignored. Each non-empty row is validated with the same rules as the single form; errors show on the row.
4. Save sends one `POST /api/assignments/bulk` with every non-empty row combined with the shared fields, `weightPerUnit: null`. On success the form closes and the new assignments appear in the list. On a server error nothing is lost from the form, and the message is shown.
5. Cancel discards everything.

## Done when
- A parent can add 5 books for one subject and child with one Save.
- Empty rows are ignored; at least one non-empty row is required.
- A row error blocks Save and points at the row.
- The form works at 360 px wide with 44 px tap targets.
- Only what's essential: no weight field, no per-row dates.

## Tests
- Web: fill shared fields and 3 rows (one left empty) → one POST to `/bulk` with 2 items; a row missing its total shows an error and sends nothing; a 400 from the server keeps the rows and shows the message; Cancel sends nothing.

## Out of scope
- Per-row dates, units or weights (edit each assignment afterwards).
- Bulk-add from the timeline.
