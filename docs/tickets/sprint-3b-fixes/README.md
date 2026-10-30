# Sprint 3b — Fixes from the Sprint 3a verification

**Approval:** fix tickets from a tester report, per HOW_WE_WORK ("Its findings become fix tickets"); started by the coordinator on 2026-10-30 while Will was away, under his instruction to keep the dev and tester working.

These tickets fix the findings in `docs/reviews/sprint-3a-verification.md` (tester, 2026-10-30, at `39879d7`). All findings were Low; L8 (importing the same file twice makes duplicates) matches the single form and API and is not fixed.

Each ticket uses the usual format. Build them in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-3b.md`.

## Order and dependencies

| Order | Ticket | Finding | Depends on | Size |
|-------|--------|---------|------------|------|
| 1 | [S3b-01 — Show clean messages for bulk and import save errors](S3b-01-clean-bulk-and-import-save-errors.md) | L1 | none | XS |
| 2 | [S3b-02 — A copy leaves out archived subjects and children](S3b-02-a-copy-leaves-out-archived-subjects-and-children.md) | L2 | none | XS |
| 3 | [S3b-03 — Report a CSV child name that matches two children](S3b-03-report-an-ambiguous-csv-child-name.md) | L3 | none | XS |
| 4 | [S3b-04 — Clearer CSV errors for the wrong separator, an open quote or no rows](S3b-04-clearer-csv-format-errors.md) | L4 | none | S |
| 5 | [S3b-05 — Stop reading a CSV that is too large](S3b-05-stop-reading-a-csv-that-is-too-large.md) | L6 | none | XS |
| 6 | [S3b-06 — A CSV total must be a plain number](S3b-06-a-csv-total-must-be-a-plain-number.md) | L7 | none | XS |
| 7 | [S3b-07 — Make the CSV file picker a 44 px target](S3b-07-make-the-csv-file-picker-a-44-px-target.md) | L5 | none | XS |
