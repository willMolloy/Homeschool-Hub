# S3a-05 — Parse an assignments CSV

**Source:** ROADMAP.md, "Fast setup" (CSV import)  
**Depends on:** none  
**Size:** S

## Goal
A pure web module turns CSV text into assignment inputs, or into clear per-line errors, using the family's subjects and children.

## Context
- Parents will export from a spreadsheet (Google Sheets, Excel, Numbers), so expect quoted fields, commas inside quotes, CRLF line ends, a trailing empty line and a UTF-8 BOM.
- Names must match the family's existing subjects and children; this ticket doesn't create subjects or children.

## Steps
1. Add `apps/web/src/features/schedule/csvImport.ts` with `parseAssignmentsCsv(text, lookups)`, returning `{ rows: AssignmentInput[], errors: { line: number; message: string }[] }`. Pure: no I/O, no React.
2. The header row is required, matched case-insensitively and in any order: `subject, title, children, unit, total, start, end`. `children` holds one or more names separated by `;`.
3. Per data row:
   - `subject` and each child name match an active subject or child, case-insensitively and ignoring surrounding spaces;
   - `unit` is one of the engine's unit types, singular or plural (`page` or `pages`);
   - `total` is a positive number within the limits;
   - `start` and `end` are `YYYY-MM-DD` or `M/D/YYYY`, with end on or after start and within the day limit;
   - `title` is required and at most 120 characters.
4. Errors use the line number in the file (the header is line 1) and say what to fix, e.g. "Line 4: no child named Margret."
5. Blank lines are skipped. More than 50 data rows is an error ("Import at most 50 assignments at a time.").

## Done when
- The parser handles every case in Context.
- Each rule in step 3 produces its own clear error message.
- The module has no dependencies beyond `@hh/engine` constants.

## Tests
- Unit tests (`apps/web/test/csv-import.test.ts`): a valid file with columns in a different order; quoted titles with commas; CRLF and BOM; `M/D/YYYY` dates; two children with `;`; a missing header column; an unknown subject; an unknown child; a bad unit; total 0; end before start; 51 rows; blank lines skipped.

## Out of scope
- The import screen (S3a-06).
- Creating missing subjects or children, or weights in the CSV.
