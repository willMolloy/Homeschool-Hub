# Sprint 7b — Fixes from the Charlotte Mason run (and the Sprint 7 tester)

**Source:** `docs/reviews/cm-term-run.md` (S7-13, 2026-10-31) and, when it lands, `docs/reviews/sprint-7-verification.md` (S7-14). **Approval:** fix tickets from a review, per HOW_WE_WORK; S7b-02 is Will's decision of 2026-10-31 ("Yep that works": replace Heavier/Lighter with "Update time estimate"). Runs after Sprint 7's tester pass and before Sprint 8.

Findings handled elsewhere: #2 (This Week shows nothing of the week) is fixed by Sprint 8's Week bars (S8-05); #3 (a behind child can't let it finish later in the check-in) by Sprint 8's Update status with "Move to {date}" (S8-06).

Each ticket uses the usual format. Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-7b.md`.

| Order | Ticket | Finding | Depends on | Size |
|-------|--------|---------|------------|------|
| 1 | [S7b-01 — Undo a whole week adjustment at once](S7b-01-undo-a-whole-week-adjustment.md) | CM #1 (High) | none | S |
| 2 | [S7b-02 — "Update time estimate" replaces Heavier and Lighter](S7b-02-update-time-estimate.md) | CM #4, Will | none | S |
| 3 | [S7b-03 — Say "ahead" plainly in the check-in](S7b-03-say-ahead-plainly.md) | CM #5 | none | XS |
| 4 | [S7b-04 — The finish forecast ignores deliberate changes](S7b-04-forecast-ignores-deliberate-changes.md) | CM #6 | none | S |
| 5 | [S7b-05 — A late line offers one next step](S7b-05-a-late-line-offers-a-next-step.md) | CM #3 (part), #6 | S7b-04 | S |
| 6 | [S7b-06 — Add several: optional dates per row](S7b-06-add-several-dates-per-row.md) | CM #7 | none | S |
| 7 | S7b-07 — Tester pass (written once the Sprint 7 tester's findings are in) | — | all | S |
