# S3a-06 — Import assignments from a CSV

**Source:** ROADMAP.md, "Fast setup" (CSV import)  
**Depends on:** S3a-03, S3a-05  
**Size:** M

## Goal
On the Assignments screen, a parent can choose or paste a CSV, see what will be imported, and import it in one step.

## Context
- `parseAssignmentsCsv` (S3a-05) does the parsing and checking; `POST /api/assignments/bulk` (S3a-03) does the all-or-nothing save.

## Steps
1. Next to "Add several", add **Import CSV**.
2. The import view has a file picker (`.csv`) and, as an alternative, a text area to paste into. A **Download template** link gives a CSV with the header row and one example row.
3. After a file is chosen or text is pasted, show a preview: the number of assignments found and a simple list (title, subject, children, dates). If there are errors, list them instead (line and message) and disable Import.
4. Import sends one bulk request. On success, close the view and show the new assignments in the list. On a server error, keep the preview and show the message.

## Done when
- A valid template-format file imports all its rows with one click.
- Any error blocks the whole import (all or nothing), and every error is listed.
- Works at 360 px wide; only what's essential.

## Tests
- Web: paste a valid CSV → the preview shows the count → Import sends one bulk POST with the parsed rows; paste a CSV with an unknown child → the error is listed and Import is disabled; a server 400 keeps the preview and shows the message; the template link's content has the header row.

## Out of scope
- Mapping columns by hand, editing rows in the preview, or partial imports.
