# Sprint 7 — Setup and polish

> **Status: approved, not started** (2026-10-31). Reviewed ticket by ticket with Will. **Approval:** Will approved Sprint 7 in the working session on 2026-10-31, to start after Sprint 6 passes its tester check. DeeDee has not reviewed it yet.

**Source:** ROADMAP.md ("Fast setup", "Year rollover and sibling reuse"), the leftover findings in `reviews/sprint-4b-verification.md` (L6, N1) and `reviews/sprint-5-verification.md` (L1–L3, O1, O4), and Will's answers of 2026-10-31:
- **Book lookup is dropped:** editions differ in page count, and a wrong prefilled total would quietly mislead parents.
- **Rollover and sibling reuse copy the plan only** (titles, units, totals, effort, weekdays, shifted dates); no check-ins or progress.
- **Custom zoom views:** a quiet Edit at the end of the zoom row; Fall, Spring and This month can be hidden; families add, rename, delete and reorder their own views; at most 6 views including Year; no automatic "Add my terms".
- **The Charlotte Mason end-to-end run** uses a realistic made-up family.

Each ticket uses the usual format. Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-7.md`.

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S7-01 — Copy a year's plan into a new year](S7-01-copy-a-years-plan-into-a-new-year.md) | none | M |
| 2 | [S7-02 — Copy assignments to another child](S7-02-copy-assignments-to-another-child.md) | S7-01 | S |
| 3 | [S7-03 — Store a family's zoom views](S7-03-store-a-familys-zoom-views.md) | none | S |
| 4 | [S7-04 — Show custom and hidden zoom views on the timeline](S7-04-show-custom-zoom-views.md) | S7-03 | S |
| 5 | [S7-05 — Edit the zoom views](S7-05-edit-the-zoom-views.md) | S7-04 | M |
| 6 | [S7-06 — The event preview skips finished assignments](S7-06-preview-skips-finished-assignments.md) | none | XS |
| 7 | [S7-07 — Say so when a template adds no breaks](S7-07-say-so-when-a-template-adds-no-breaks.md) | none | XS |
| 8 | [S7-08 — Say which days off a saved template left out](S7-08-say-which-days-off-a-template-left-out.md) | none | XS |
| 9 | [S7-09 — Hint that the phone edit bar scrolls](S7-09-hint-that-the-edit-bar-scrolls.md) | none | XS |
| 10 | [S7-10 — A very slow pace still gets a briefing line](S7-10-a-very-slow-pace-gets-a-line.md) | none | XS |
| 11 | [S7-11 — Choosing the subject's own days stores no history](S7-11-same-days-store-no-history.md) | none | XS |
| 12 | [S7-12 — Let the tap-target script take a width](S7-12-tap-target-script-width.md) | none | XS |
| 13 | [S7-13 — Run a Charlotte Mason term end to end](S7-13-run-a-charlotte-mason-term-end-to-end.md) | S7-01 to S7-12 | M |
| 14 | [S7-14 — Tester pass: setup and polish](S7-14-tester-pass.md) | S7-01 to S7-13 | S |
