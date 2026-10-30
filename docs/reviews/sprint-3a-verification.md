# Sprint 3a verification (fast setup)

Tester verification of tickets S3a-01 to S3a-06 in `docs/tickets/sprint-3a-setup/` at commit 39879d7 (branch `claude/test-coverage-analysis-6dehbu`).
Date: 2026-10-30. No product code or tests were changed for this review.

## Result: PASS, with low-severity follow-ups

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate). Counts: 796 web, 596 api, 63 db, 313 engine (x 8 time-zone runs).
- No high or medium issues. Eight low findings, all reproduced.
- Every "Done when" item below was exercised against the real API and a real browser (Chromium, 360 px), not only jsdom.
- Setup: scratch database `hh_tester_dev` (not `hh_test`; `db:seed` refuses any name not ending `_dev`). It held the seeded demo family plus two families I created, "Tester Fam" and "Other Fam" (for foreign ids and archived rows). The API ran on :3000 and the Vite dev server on :5173. Both servers are stopped and the database is dropped.
- Screenshots in the scratchpad (`/tmp/claude-0/-home-user-Homeschool-Hub/7a240ed6-3fb3-5430-b251-2b10ddef71fc/scratchpad/`):
  - `s-list.png`: the three buttons wrap onto two rows at 360 px, no horizontal scroll.
  - `s-bulk-empty.png`: the Add several form with its rows.
  - `s-import-errors.png`: the error list with Import greyed out.
  - `s-timeline-editbar.png`: the edit bar with Copy on the row beside "End a week later".
  - `s-copy-archived-subject.png`: the copy form with an archived subject and the server error.
  - The rest are named `s-*.png`.
  - The full-page screenshots show the fixed tab bar floating mid-page. That is a capture artifact.

## Verified, per ticket

### S3a-01 Copy from the Assignments screen: meets "Done when"

- Copy appears only on the edit form (buttons Save, Cancel, Copy, Archive). The Add form shows only Add and Cancel.
- Copy opens "Add assignment" prefilled: subject, "Saxon 5/4 (copy)", children Ada and Ben ticked, dates, unit, total.
- Saving sent exactly one `POST /api/assignments`, with `weightPerUnit: null`. No PATCH was sent, and the original is unchanged.
- A stored weight of 3.5 stayed 3.5 in the copy. The suggestion did not override it. Changing the unit afterwards resets to the new unit's suggestion and posts `null`, as the existing form does.
- A 120-character title copies to exactly 120 characters ending " (copy)".
- Cancel sent nothing. "Add assignment" after a cancelled copy opens empty.
- Copy buttons are 79x45 px.

### S3a-02 Copy from the timeline edit bar: meets "Done when"

- Copy is not present until a bar is selected. It is 79x45 px, fits beside "End a week later", and there is no horizontal overflow at 360 or 320 px.
- Copy opens the sheet prefilled (title "Weighty (copy)", dates, weight 3.5). Saving sent one POST with `weightPerUnit: 3.5`. The sheet closed and the selection cleared.
- Cancel closes the sheet. The edit bar stays selected and no request is sent.
- The prefill uses the same `copyOfAssignment` function as S3a-01.

### S3a-03 Bulk endpoint: meets "Done when" (real HTTP)

| Request | Result |
|---|---|
| 3 valid items | 201, in request order |
| 50 items | 201, 50 rows |
| 51 items | 400 "Send at most 50 assignments." |
| 0 items | 400 |
| Bad date order in item 3 | 400 `invalid_range` "Assignment 3: ..." |
| Item 2 total 0 | 400 "Assignment 2: totalUnits ..." |
| 121-character title | 400 |
| 120-character title | 201 |
| Duplicate child ids in one item | 400 "Ids can't repeat" |
| 2027-02-30 | 400 |
| Empty `childIds` | 400 |
| Unknown item key | 400 |
| Unknown top-level key | 400 |
| Item `null` or a string | 400 |
| Body is an array | 400 |
| Malformed JSON | 400 |
| 2 MB body | 413 |
| Signed out | 401 |
| Another family's child (item 2 of 2) | 400 `invalid_reference`, item 1 rolled back, 0 rows |
| Another family's subject | 400 `invalid_reference`, 0 rows |
| Archived subject or child | 400 `invalid_reference` |

- Foreign-id messages match the single route's, with "Assignment N: " in front.
- A weight of 3 recorded one `weight_choice` row. Items with `weightPerUnit: null` recorded none.
- Identical titles are accepted (201). This matches the single route.
- The demo family can bulk-create assignments. The single route allows it too. Only events are demo-blocked.

### S3a-04 Add several: meets "Done when"

- Five or more rows with one Save sent one `POST /bulk` with 6 items, `weightPerUnit: null`.
- Empty rows were ignored. All-empty gives "Add at least one title and total."
- A row with only a title shows "Total is required." on that row and sends nothing. Total 0 and 1.234 are also rejected inline.
- Duplicate titles, a 120-character title and a title containing quotes and a comma all saved correctly. The form closed and focus moved to the first new card.
- A server 400 kept all rows and showed "Row 1: ...", numbered by on-screen position. See L1.
- Cancel sent nothing. The last row has no Remove button.
- 360 px: no overflow, and Add row, Remove and Save are at least 44 px high. The child checkboxes are 20 px, but their labels are 44 px.

### S3a-05 CSV parser: meets "Done when"

I pasted about 50 cases into the real import form.

- Accepted:
  - Excel BOM with CRLF, and CR-only line ends.
  - A trailing comma on every line.
  - Columns in another order, extra columns, and a repeated column.
  - Names that differ in case or spaces.
  - A duplicate child in a row (used once).
  - Dates as `1/4/2027` or ISO.
  - Singular and plural units.
  - A quoted title with commas, quotes and a newline.
  - A title of 120 characters (121 is rejected).
  - Unicode titles.
  - Blank lines and a comma-only row (skipped).
  - 50 rows.
- Rejected, each with its own message:
  - 2/30/2027, `1/4/27`, and a datetime.
  - An unknown child, an archived child, an unknown subject and an archived subject.
  - An unknown unit, total 0 and total 100001.
  - End before start, and a range over 1096 days.
  - A missing header column.
  - 51 rows.
- Line numbers are right across blank lines (an error on the 5th physical line says Line 5).
- Every error is listed, and any error means zero rows.

### S3a-06 Import view: meets "Done when"

- The template link downloads `assignments-template.csv` containing the header plus `Math,Saxon 5/4,Ada,lessons,120,2026-11-02,2026-12-17`. Uploading the template as is previews "1 assignment".
- An Excel-style file (BOM, CRLF, quoted comma and quotes) previewed 3 rows. Import sent one bulk POST and 3 rows appeared in the list.
- Errors are listed in full with Import disabled. An empty file, whitespace and binary junk are handled (binary gives one header error).
- A server 400 kept the preview and left Import enabled. A double-click on Import created one row.
- 360 px: no overflow. The template link is 44 px high and Import and Cancel are 45 px. The native file input is 24 px (L5).

## Recorded developer decisions: my verdict

| Decision | Verdict |
|---|---|
| S3a-01 long titles: cut the original, keep " (copy)" | Agree. Verified at 120. |
| S3a-01 archived originals: Copy shows, the copy is active, an archived subject is still listed | Agree on Copy for archived originals. Disagree on keeping an archived subject or child pre-selected (see L2). The copy cannot be saved as is. |
| S3a-02 after saving: behaves exactly like Add (selection clears, bar flashes) | Agree. The ticket's step 3 says "exactly like", and `afterAdd.ts` does not select. Its Context line and test line ("new bar is selected") are inaccurate. The ticket needs a wording fix, not the code. |
| S3a-03 prefix "Assignment N:" on every item error, 1-based | Agree. |
| S3a-03 `checkRefs` per item inside the transaction | Agree. Rollback verified. |
| S3a-04 empty row = no title and no total | Agree. |
| S3a-04 "Row N" uses on-screen numbering | Agree. Works, but see L1 for the field-name leak. |
| S3a-04 at least one row remains | Agree. |
| S3a-05 same-named children: the first wins silently | Disagree (L3). The API allows two active children with the same name (case-insensitively), and the import silently picks one. |
| S3a-05 all-or-nothing, single line-0 error for more than 50 rows | Agree. |
| S3a-05 only commas separate fields | Agree with the rule. Disagree that the error message is enough (L4). |
| S3a-06 one open panel, text copied into the paste box, template as a `data:` URL | Agree. The `data:` URL worked in Chromium. |
| S3a-06 server error shows the row's title | Agree, but see L1 (the field name leaks through). |

## Findings

### High

None.

### Medium

None.

### Low

**L1. Server errors in Add several and Import leak a field name.**
- Repro:
  1. Open Add several (or Import CSV) and fill in a valid row.
  2. In another tab, archive the subject.
  3. Press Save (or Import).
- Expected: "Row 1: every id must be one of your active subjects." and "Alpha: every id ...", matching the single form's wording.
- Actual: "Row 1: subjectId: every id must be one of your active subjects." and "Alpha: subjectId: every id ...".
- Cause: `saveError` only strips a leading `field: `. The bulk message starts with "Assignment N: ", so the regex never matches.
- Files: `formBits.tsx`, `BulkAssignmentsForm.tsx`, `ImportAssignmentsForm.tsx`.

**L2. Copying an assignment with an archived subject or archived child opens a form that cannot save.**
- Repro:
  1. Archive a subject, or a child who is on an assignment.
  2. On Assignments, open that assignment and press Copy.
  3. Press Add.
- Expected: either drop the archived child or leave the archived subject unselected, or say what to change.
- Actual: the form shows "Latin (archived)" selected, or "Old Kid Archived" ticked. Add returns 400 and the bare message "every id must be one of your active subjects." (or children), with no pointer to the field.
- The parent can fix it by choosing another subject or unticking the child, so this is low. The same applies on the timeline copy, since it uses the same prefill and form. I did not run that variant in the timeline.
- Archived originals themselves copy fine (one POST, a normal active assignment).

**L3. Import silently picks one of two children with the same name.**
- Repro:
  1. `POST /api/children {"name":"ada"}` returns 201 even though "Ada" exists.
  2. Import a row with children `Ada`.
- Expected: an error ("two children are named Ada").
- Actual: the preview shows one child, the first by sort order, and Import is enabled. Subjects are unique per family, so this affects children only.

**L4. Several common spreadsheet exports fail with confusing or unhelpful messages. All of them block safely.**
- Semicolon-delimited (European Excel) or tab-delimited text, including a paste straight from Sheets: "the header is missing the columns subject, title, children, ..." (all 7 listed). The message does not say the file uses `;` or tab.
- An unquoted comma in a title or number (for example `1,000`): the columns shift, giving "start must be a real date ... (got "000")".
- An unterminated quote swallows the rest of the file. The errors on that line are "children is required", "unit must be ...", and so on.
- A header-only file shows "0 assignments" with Import disabled and no explanation. An empty file shows nothing at all.
- Suggested fix: detect `;` or tab in the header and say so. Detect an unclosed quote. Show "No rows found."

**L5. The native file input is 24 px tall at 360 px.**
- Measured on the CSV file input. Copy, Add several, Import CSV, the template link and all buttons are at least 44 px.
- The paste box is the fallback. The ticket's 44 px list did not name the file picker explicitly.

**L6. A big file freezes the form for about 10 seconds.**
- Repro: choose a CSV of 150,000 rows (about 8 MB).
- Actual: the "at most 50" error appears after about 10 s, because the whole file is parsed and every record is built before the count is checked.
- Expected: stop once the count passes 50. Unlikely in real use.

**L7. The total field accepts hex and exponent forms.**
- Repro: import `0x10` (becomes 16) or `1e2` (becomes 100) as the total.
- Expected: reject anything that is not plain digits with an optional decimal part. The values are in range and imported as numbers, so this is harmless, only surprising.

**L8. Importing the same file twice creates duplicates with no warning.**
- The same applies to Add several and to copying.
- This is consistent with the single form and the API (titles are not unique), so I am noting it, not asking for a change.

### Not a finding

- The date inputs in the timeline edit bar are 40 px high, below the 44 px target. I did not find a change in S3a-02 that touched them, so I treat it as pre-existing. Copy, the step buttons and the close button are 44 px or more.

## Could not verify

- Re-choosing the same CSV file in the native file dialog. Chrome may not fire `change` for an identical selection, and the input is never reset. Playwright's `setInputFiles` cannot reproduce the native dialog. The parent can still edit the text in the paste box, which receives the file text.
- Excel, Numbers and Google Sheets exports. I simulated them with BOM, CRLF and trailing commas, not with the real applications.
- Safari and Firefox. This was Chromium only. The `data:` template download in particular is untested there.
- Screen reader behavior. I checked the ARIA labels and groups in the DOM only.
- Copy from the timeline with an archived subject or child. The code path is shared with the Assignments screen, so L2 should apply, but I did not run it.

## Recommended fix tickets

1. **S3a-08 (L1):** strip the field name from bulk and import server errors, with tests in both forms.
2. **S3a-09 (L2):** copying with an archived subject or child should drop or flag the archived value.
3. **S3a-10 (L3):** reject an ambiguous child name in the import. Consider unique active child names.
4. **S3a-11 (L4, L7):** better CSV error messages (delimiter, unclosed quote, empty or header-only file) and a stricter total check.
5. **Backlog (L5, L6, L8):** the file input height, stopping the parse early, and a duplicate-import warning.
