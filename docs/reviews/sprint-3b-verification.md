# Sprint 3b verification (fixes from the Sprint 3a report)

Tester verification of tickets S3b-01 to S3b-07 in `docs/tickets/sprint-3b-fixes/` at commit dfeaf27 (branch `claude/test-coverage-analysis-6dehbu`).
Date: 2026-10-30. No product code or tests were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: PASS. All seven findings (L1 to L7) are fixed; no new findings above Low

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled: **796 api, 618 web** (596 at Sprint 3a, +22), **63 db**, **313 engine** (x 8 time-zone runs). I confirmed web by running `npm test -w @hh/web` separately (53 files, 618 tests).
- Every "Done when" item was exercised in a real browser (Chromium, 360 px unless stated) against the real API, not only jsdom.
- Setup: scratch database `hh_tester_dev` with the demo seed plus a family "Tester Fam" (children Ada, Ben, and a second active "ada"; an archived child "Old Kid"; subjects Math, Latin, Alpha and an archived "Old Subj"). The API ran on :3000 and Vite on :5173. Both servers are stopped and the database is dropped. `hh_test` was not touched.
- Screenshots are in `docs/progress/screens/sprint-3b/`. They are referenced below. Full-page shots show the fixed tab bar floating mid-page; that is a capture artifact.

## Original findings: status

| Finding | Ticket | Status | Evidence |
|---|---|---|---|
| L1 field name leaks in bulk/import save errors | S3b-01 | Fixed | See below |
| L2 copy of archived subject/child cannot save | S3b-02 | Fixed | See below |
| L3 ambiguous child name silently picks one | S3b-03 | Fixed | See below |
| L4 confusing CSV format errors | S3b-04 | Fixed | See below |
| L5 file input 24 px | S3b-07 | Fixed | 44 px at 360, 320 and 1024 px |
| L6 big file freezes the form | S3b-05 | Fixed | See below |
| L7 total accepts hex/exponent | S3b-06 | Fixed | See below |

## Verified, per ticket

### S3b-01 (L1): meets "Done when"

Re-ran the Sprint 3a repro: fill a row, archive the subject (or child) through the API in the background, then Save or Import.

| Form | Server problem | Message shown |
|---|---|---|
| Add several | archived subject, row 1 empty, row 2 filled | "Row 2: every id must be one of your active subjects." |
| Add several | archived child, row 1 filled | "Row 1: every id must be one of your active children." |
| Import (2 rows) | archived subject | "Alpha one: every id must be one of your active subjects." |
| Import | archived child used only on row 2 | "Row B: every id must be one of your active children." |

- No `subjectId` or `childIds` in any message. The "Row N" number follows the on-screen row, not the server's count (row 1 empty gave "Row 2"), which is right.
- The form kept its rows and the preview stayed. The server rejected the whole batch (0 rows created, checked in the database).
- Screenshots: `bulk-server-error-360.png`, `import-server-error-360.png`.
- Single-form messages are unchanged per the code (`saveError` untouched, `bulkSaveError` is a separate helper). I did not re-run the single form in the browser.

### S3b-02 (L2): meets "Done when"

From the Assignments screen (Edit, then Copy):

| Original | Copy opens with | Add |
|---|---|---|
| archived subject, active child Ben | "Choose a subject…", Ben ticked | "Pick a subject." with no request; after choosing Math, one POST, form closes |
| Math, Ben + archived Old Kid | Math, only Ben ticked | one POST, no error, no need to edit |
| Math, only archived Old Kid | Math, no child ticked | "Pick at least one child." with no request; after ticking Ben, one POST |
| archived subject + Old Kid and Ada | no subject, only Ada ticked | "Pick a subject."; after choosing Math, one POST with `childIds` of Ada only |

- Screenshots: `copy-ArchSubj-360.png`, `copy-OnlyArchKid-360.png`, `copy-BothArch-360.png`.
- Timeline: the copy of an assignment with Ben + archived Old Kid opened with Math and only Ben, and saved on the first Add (`timeline-copy-OneArchKid-360.png`). Assignments whose subject or only children are archived have **no bar on the timeline at all**, so Copy cannot be reached for them there. The timeline's other archived cases are covered by the unit test, not a browser run. See "Could not verify".

### S3b-03 (L3): meets "Done when"

- With two active children named "Ada" and "ada": a row with `Ada` gives "Line 2: two children are named Ada. Rename one under Kids first." Import stays disabled.
- A row `Ben;ADA` gives the error on that line (name shown as typed in the file). A row with only `Ben` is not flagged.
- After archiving the lowercase duplicate, `Ada` imports (1 row). An archived duplicate does not count.
- Subjects are unique per family in the API, so the subject variant cannot be hit from the app; I rely on the unit test.

### S3b-04 (L4): meets "Done when"

Pasted into the real form. Import is disabled in every case below.

| Input | Message |
|---|---|
| Semicolon file | "This file uses semicolons (or tabs) between columns. Save it as CSV with commas." |
| Tab file | the same message |
| Unclosed quote on line 3 | "Line 3: a quote is never closed." (one error, nothing else) |
| Header only, or header plus blank and comma-only lines | "No assignments found under the header." |
| Unquoted comma in the title (line 2) | "Line 2: too many columns. Put quotes around text that contains commas." |
| Same on line 3 only | "Line 3: ..." (line 2 is fine) |
| Trailing comma on a row | accepted (1 row) |

- Screenshots: `import-semicolon-error-360.png`, `import-unclosed-quote-360.png`, `import-too-many-columns-360.png`.
- A comma header with a tab-separated data row is treated as a normal CSV, so it is not called a tab file. A tab file whose cells hold commas still gets the separator message, which is right.
- No horizontal overflow at 360 px with any of these messages (scrollWidth 360).

### S3b-05 (L6): meets "Done when"

Chosen through the real file input:

| File | Result |
|---|---|
| 3 rows (178 B) | previews 3 rows |
| 50 rows | previews 50 rows, Import enabled |
| 1,948,933 B (about 2 MB, 40,000 rows) | at once (about 135 ms): "This file is too large. Import at most 50 assignments at a time." |
| 2,097,152 B, 3 rows plus blank padding | the same message |
| 7.4 MB, 150,000 rows | the same message at once (the 3a repro froze for about 10 s) |
| exactly 1,048,576 B | read, previews 3 rows |
| 1,048,577 B | the too-large message |

- After a too-large file the paste box is empty and Import disabled, so an earlier preview cannot be imported by mistake. Typing in the paste box clears the message.
- 10,000 pasted rows: the row-cap error shows in about 0.2 s in the page (most of that is the textarea). The parser alone takes 1 to 7 ms for 10,000 to 150,000 rows, with valid or invalid rows. Screenshot: `import-10000-rows.png`, `import-file-too-large-360.png`.
- Note: Playwright's own `fill()` on a 3,000-row text takes about 14 s even in a plain textarea on a blank page. That is a tool limit, not the app; I set the value in the page for the large pastes.

### S3b-06 (L7): meets "Done when"

| Total | Result |
|---|---|
| `0x10`, `1e2`, `.5`, `-3`, `+3`, `5.`, `ten`, quoted `"1,000"` | "Line 2: total must be a number, like 300." |
| `300` | accepted |
| ` 12.5 ` | accepted |
| `0`, `100001` | "total must be more than 0 and at most 100,000." (unchanged) |
| `1.234` | "total can have at most 2 decimal places." (unchanged) |

Screenshot: `import-total-error-360.png`.

### S3b-07 (L5): meets "Done when"

- At 360 px the file input is 286 x 44 px, and its native button is 44 px. At 320 px it is 246 x 44, and at 1024 px 870 x 44.
- Template link 44, Import and Cancel 45.2, textarea 161 px. No horizontal overflow at 360 or 320 px.
- Clicking the left of the picker opens the file chooser, clicking the "CSV file" label opens it, and the input takes keyboard focus. A chosen file still fills the paste box and preview (all the S3b-05 file tests ran through it).
- Screenshot: `import-form-360.png`.

## Recorded developer decisions: my verdict

| Decision | Verdict |
|---|---|
| S3b-01 one helper, `saveError` unchanged; no label leaves the server text | Agree. Note that with no label the field name would still show, but both forms always pass a label. |
| S3b-02 `copyOfAssignment(a, lookups)`; active means in the list and not archived | Agree. This is why the timeline works with its archived-free lists. |
| S3b-02 Add form unchanged | Agree. |
| S3b-03 ambiguity is trimmed, case-insensitive, active only; subjects checked too | Agree. |
| S3b-03 name as typed, once per row, no extra "no child named" | Agree. |
| S3b-04 whole-file messages have no "Line N" prefix; each stops the parse | Agree. |
| S3b-04 check order; header counts as semicolon/tab only if it is a single cell | Agree. |
| S3b-04 "too many columns" only for non-blank cells past the header; that row gets only this error | Agree. |
| S3b-04 empty file unchanged (shows nothing) | Agree with the ticket. See L9 for a cosmetic follow-up. |
| S3b-05 1 MB = 1,048,576 B; message as the form error; paste box cleared; no size check on pasted text | Agree. Verified at the exact boundary. |
| S3b-05 parser stops at the 51st non-blank data row, header checks first | Agree. |
| S3b-06 plain `^\d+(\.\d+)?$`; `.5`, `5.`, `-3`, `+3` rejected; new wording replaces "(got ...)" | Agree. The ticket's rule (digits, optional `.` and digits) rejects `.5` too, and the message is clear. |
| S3b-07 real input with `min-height` and a 44 px `::file-selector-button` | Agree. Measured. |

I disagree with none.

## Findings

### High

None.

### Medium

None.

### Low

**L9. A file that is too big says "at most 50 assignments" even when it holds few rows.**
- Repro: choose a 2 MB CSV that is 3 rows plus blank padding (or a large file with long text in a few cells).
- Expected: a message about size (for example "This file is too large (over 1 MB)").
- Actual: "This file is too large. Import at most 50 assignments at a time." That is the ticket's wording, so it is as designed; it is only slightly misleading for a few-row file. Low, optional.
- Related cosmetic: an empty file (or only whitespace) shows no message and nothing happens. The ticket and decision keep this.

**L10. A timeline copy can still hit a bare server error if the page is stale.** (Not reproduced; reasoning only.)
- If a subject is archived in another tab after the timeline loaded, its lookups still list it as active, so the copy keeps it and the server answers with the plain "every id must be one of your active subjects." A reload fixes it. This is the ordinary stale-page case, so I did not run it, and I do not ask for a change.

### Not a finding

- L8 (importing the same file twice makes duplicates) stays as agreed: it matches the single form and the API.
- The timeline edit bar's date inputs at 40 px: pre-existing, as in the 3a report.

## Could not verify

- Timeline Copy for an assignment whose subject, or all of whose children, are archived. Those assignments have no bar on the timeline, so Copy is not reachable. The stale-page case (L10) was not run.
- Subject ambiguity in the import (the API keeps subject names unique per family), so only the unit test covers it.
- Single-form error messages after S3b-01, in the browser (code and unit tests only).
- Re-choosing the same file in the native dialog, real Excel, Numbers or Sheets exports, Safari, Firefox and screen readers, as in the 3a report. This pass was Chromium only.
