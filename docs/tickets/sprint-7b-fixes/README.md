# Sprint 7b — Fixes from the Charlotte Mason run (and the Sprint 7 tester)

**Round 2 (S7b-15 to S7b-21):** from `docs/reviews/sprint-7b-verification.md` (S7b-08).  
**Also from:** `docs/reviews/pr3-independent-verification.md` (an independent tester, pushed to the branch on 2026-10-31): S7b-09 to S7b-14.

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
| 7 | [S7b-07 — Small fixes from the Sprint 7 tester](S7b-07-small-fixes-from-the-sprint-7-tester.md) | 7-tester F1, F3–F5, F7 | none | S |
| 8 | [S7b-09 — Week adjustments never change past weeks](S7b-09-week-adjustments-never-change-past-weeks.md) | Indep. F-02 (High) | none | M |
| 9 | [S7b-10 — "Minutes a day" counts the days the work really happens](S7b-10-minutes-a-day-counts-the-real-days.md) | Indep. F-03 (High) | S7b-09 | M |
| 10 | [S7b-11 — Copy to a new year skips what's already copied, and can be undone](S7b-11-copy-to-a-new-year-skips-what-is-already-copied.md) | Indep. F-05 (High) | none | S |
| 11 | [S7b-12 — Copy to another child skips shared assignments](S7b-12-copy-to-another-child-skips-shared-assignments.md) | Indep. F-07 | S7b-11 | XS |
| 12 | [S7b-13 — Saved templates keep holidays on their real dates](S7b-13-saved-templates-keep-holidays-on-their-dates.md) | Indep. F-06 | none | S |
| 13 | [S7b-14 — Small fixes from the independent review](S7b-14-small-fixes-from-the-independent-review.md) | Indep. F-04, F-11–F-14 | S7b-02 | S |
| 14 | [S7b-08 — Tester pass](S7b-08-tester-pass.md) | — | S7b-01 to S7b-07, S7b-09 to S7b-14 | S |
| 15 | [S7b-15 — An "ahead" check-in row fits a phone](S7b-15-ahead-row-fits-a-phone.md) | 7b-tester N1 (High) | none | XS |
| 16 | [S7b-16 — Update time estimate starts at the current estimate](S7b-16-time-estimate-starts-at-the-current-estimate.md) | 7b-tester N2 | none | XS |
| 17 | [S7b-17 — Week-long breaks stay around their holiday](S7b-17-week-long-breaks-keep-their-holiday.md) | 7b-tester N3 | S7b-13 | S |
| 18 | [S7b-18 — A last-week adjustment never changes past weeks either](S7b-18-last-week-adjustment-keeps-past-weeks.md) | 7b-tester N4 | S7b-09 | S |
| 19 | [S7b-19 — The late line stays honest after a days change](S7b-19-forecast-fixes.md) | 7b-tester N5, N6 | S7b-04, S7b-05 | S |
| 20 | [S7b-20 — Undo labels read well on a phone](S7b-20-undo-labels-read-well.md) | 7b-tester N7, N8 | none | XS |
| 21 | [S7b-21 — Re-test](S7b-21-retest.md) | — | S7b-15 to S7b-20 | XS |
