# Sprint 6 — Steering: adjust a week, undo and reset, and effort in time

> **Status: proposed, not started** (2026-10-31). Written from decisions C1–C3 (ROADMAP.md, decided by Will on 2026-10-30). **Approval to build:** _none yet_ (Will or DeeDee, recorded here). Starts after Sprint 5.

**Source:** ROADMAP.md core checklist, "Steering" and "Effort", and decisions:
- **C1:** when a week is adjusted more than once, the most recent edit wins.
- **C2:** undo the last change, plus reset an assignment to how it was created.
- **Missed days (Will, 2026-10-31):** the weekly check-in covers missed work, so the planned missed-day make-up choice is dropped and the "Missed a day?" button is removed (S6-04).
- **C3:** effort is asked in time ("about how long will that take?"), stored as weight per unit; a heavier/lighter nudge on the bar; corrections carry forward.

Each ticket uses the usual format. Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-6.md`.

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S6-01 — Load week adjustments newest edit last](S6-01-load-week-adjustments-newest-edit-last.md) | none | XS |
| 2 | [S6-02 — Add the week adjustment endpoints](S6-02-add-the-week-adjustment-endpoints.md) | S6-01 | S |
| 3 | [S6-03 — Adjust this or a coming week on This Week](S6-03-adjust-this-or-a-coming-week.md) | S6-02 | M |
| 4 | [S6-04 — Remove "Missed a day?" from This Week](S6-04-remove-missed-a-day-from-this-week.md) | none | XS |
| 5 | [S6-05 — Store an assignment's original and the last change](S6-05-store-original-and-last-change.md) | none | S |
| 6 | [S6-06 — Record and undo the last change](S6-06-record-and-undo-the-last-change.md) | S6-02, S6-05 | M |
| 7 | [S6-07 — Reset an assignment to how it was created](S6-07-reset-an-assignment.md) | S6-05 | S |
| 8 | [S6-08 — Undo after a change, and reset from the edit bar](S6-08-undo-and-reset-in-the-app.md) | S6-06, S6-07 | M |
| 9 | [S6-09 — Ask effort in time on the assignment form](S6-09-ask-effort-in-time.md) | none | M |
| 10 | [S6-10 — "Feels heavier / lighter" on the edit bar](S6-10-feels-heavier-or-lighter.md) | S6-09 | S |
| 11 | [S6-11 — Tester pass: steering](S6-11-tester-pass.md) | S6-01 to S6-10 | S |
