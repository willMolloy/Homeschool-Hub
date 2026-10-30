# S3a-07 — Tester pass: fast setup

**Source:** HOW_WE_WORK.md, "Tester"  
**Depends on:** S3a-01 to S3a-06  
**Size:** S

## Goal
The tester independently verifies Sprint 3a against each ticket's "Done when" and the edge cases below, and writes `docs/reviews/sprint-3a-verification.md`.

## Steps
1. Run `bash scripts/check.sh` at the sprint's last commit and record the result.
2. Check each ticket's "Done when" item by item, with evidence (a test name, a request and response, or a screenshot).
3. Try edge cases, at least:
   - copy an archived assignment, and copy one whose subject is archived;
   - bulk-add and CSV import with the same title twice, with a 120-character title, and with names that differ only in case or spaces;
   - a CSV saved by Excel (BOM, CRLF), a CSV with a trailing comma on each line, an empty file;
   - another family's ids sent straight to `/api/assignments/bulk`;
   - the demo login.
4. Write findings with severity (High, Medium, Low), how to reproduce, and the expected behaviour.

## Done when
- The report exists, covers every ticket and lists every finding with steps to reproduce.
- The tester changes no source or test files; findings become fix tickets.

## Out of scope
- Fixing findings.
