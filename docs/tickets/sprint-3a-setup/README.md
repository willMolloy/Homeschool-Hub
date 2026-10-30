# Sprint 3a — Fast setup

**Source:** ROADMAP.md, core checklist, "Fast setup" (agreed 2026-10-30).

**Approval:** Will approved this batch in the working session on 2026-10-30 ("Proceed with that batch of tickets"), after the tickets were committed as pending approval. DeeDee had not reviewed it before it was built; it was verified in S3a-07 and is on the branch for her review before merging. The goal: a parent can enter a whole term without typing one form per book.

Each ticket uses the usual format: Goal / Context / Steps / Done when / Tests / Out of scope. Build them in the order below, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-3a.md`. The tester verifies the whole sprint at the end (S3a-07).

None of these tickets touches the engine, and none needs decisions C1–C3.

## Order and dependencies

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S3a-01 — Copy an assignment from the Assignments screen](S3a-01-copy-an-assignment-from-the-assignments-screen.md) | none | S |
| 2 | [S3a-02 — Copy an assignment from the timeline edit bar](S3a-02-copy-an-assignment-from-the-timeline-edit-bar.md) | S3a-01 | S |
| 3 | [S3a-03 — Add the bulk-create assignments endpoint](S3a-03-add-the-bulk-create-assignments-endpoint.md) | none | S |
| 4 | [S3a-04 — Add several assignments at once](S3a-04-add-several-assignments-at-once.md) | S3a-03 | M |
| 5 | [S3a-05 — Parse an assignments CSV](S3a-05-parse-an-assignments-csv.md) | none | S |
| 6 | [S3a-06 — Import assignments from a CSV](S3a-06-import-assignments-from-a-csv.md) | S3a-03, S3a-05 | M |
| 7 | [S3a-07 — Tester pass: fast setup](S3a-07-tester-pass-fast-setup.md) | S3a-01 to S3a-06 | S |
