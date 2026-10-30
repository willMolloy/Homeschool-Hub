# Sprint 3b progress — fixes from the Sprint 3a verification

Tickets: `docs/tickets/sprint-3b-fixes/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3b-01 Show clean messages for bulk and import save errors | 555eec3 | `bulkSaveError` in `formBits.tsx`, used by Add several and Import |
| S3b-02 A copy leaves out archived subjects and children | 42dc749 | `copyOfAssignment(a, lookups)` clears an inactive subject and drops inactive children |
| S3b-03 Report a CSV child name that matches two children | c5345ea | `activeByName` in `csvImport.ts` marks a shared name; the row reports it |
| S3b-04 Clearer CSV errors for the wrong separator, an open quote or no rows | e77a8ff | `parseAssignmentsCsv` checks separator, open quote, no rows and extra columns; `records` also returns where a quote was left open |
| S3b-05 Stop reading a CSV that is too large | 74132c7 | `MAX_IMPORT_BYTES` check in `ImportAssignmentsForm`; `records` stops after the 51st data row |
| S3b-06 A CSV total must be a plain number | (this commit) | `totalProblem` checks `^\d+(\.\d+)?$` before `Number()` |

## Decisions (conservative calls on ambiguous points)

- **S3b-01 one helper.** `bulkSaveError(err, label)` runs `saveError`, then swaps "Assignment N: " plus an optional "field: " for the label of the Nth item (the on-screen row for Add several, the title for Import). When there is no label it leaves the server's text as it was. `saveError` itself is unchanged, so single-form messages are the same.
- **S3b-02 lookups argument.** `copyOfAssignment` now takes the family's subjects and children. A subject or child counts as usable only when it is in the list and not archived, so the timeline (whose lists leave archived rows out) behaves like the Assignments screen. A cleared subject is `""`, which shows "Choose a subject…".
- **S3b-02 Add form unchanged.** The form's existing allowance for listing the original's archived subject on an edit form stays; a copy never has one selected, so it does not show.
- **S3b-03 what is ambiguous.** Two active rows whose names match after trimming and ignoring case. Archived rows never count. Subjects get the same check as children (the ticket's goal names both), with "Rename one under Subjects first."
- **S3b-03 error wording.** The name is shown as typed in the file. A name repeated in one row (for example "Sam;sam") gives the error once for that row. The ambiguous name gives only this error, not also "no child named".
- **S3b-04 whole-file messages.** The separator and no-rows messages have `line: 0` (no "Line N:" prefix), like the 50-row cap. The unclosed quote is reported on the line where the quote opened. Each of these stops the parse, so no other errors are listed with it.
- **S3b-04 check order.** Separator first, then an unclosed quote, then the missing-columns header check, then no rows. A header counts as semicolon/tab-separated when it is a single cell containing `;` or a tab (so a header with commas is never called that).
- **S3b-04 extra columns.** A row is "too many columns" only when a non-blank cell sits past the header's last column, so a trailing comma on a row is still fine. That row reports only this error (its other cells have shifted, so further messages would mislead); other rows are still checked.
- **S3b-04 empty file.** Unchanged: an empty or blank paste shows nothing and keeps Import disabled (the form only parses non-blank text).
- **S3b-05 the size limit.** "1 MB" is 1,048,576 bytes (`MAX_IMPORT_BYTES`); a file of exactly that size is still read. The message is the ticket's, shown as the form error, and the paste box is cleared so a preview from an earlier file or paste can't be imported by mistake. Pasted text has no size check (the parser stops early on it instead).
- **S3b-05 early stop.** The parser stops reading at the 51st non-blank data row. The header checks (separator, missing columns) still come first, so a wrong header on a huge file reports the header; a row-cap error otherwise beats errors in later rows, as before.
- **S3b-06 what passes.** Digits with an optional `.` and digits, after trimming, so `.5`, `5.`, `-3` and `+3` are errors with the same "total must be a number, like 300." (this replaces the old "(got …)" wording for non-numbers). The range and 2-decimal checks are unchanged and still run on a plain number. `"1,000"` in quotes gets this error too.
