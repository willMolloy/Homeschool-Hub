# Sprint 4 — Assignment weekdays, the weekly briefing and "Missed a day?"

> **Status: proposed** (2026-10-30). Written from Will's answers; DeeDee reviews before the developer starts.

**Source:** ROADMAP.md, core checklist ("Assignment weekdays", "Steering"), and Will's product answers of 2026-10-30:
- **Weekdays:** a subject can have default weekdays. A new assignment starts from the subject's days, or from every school day if the subject has none. The assignment form shows the days as tappable chips; tapping one customises this assignment. "Set as default for this subject" appears when the days differ from the subject's. Assignments that never customised their days follow the subject's default if it changes later (like effort defaults, D20).
- **Briefing:** a short line per child on This Week, only when something needs attention: will finish late, plan problems, a check-in nudge, and a heavy week (only when well above the child's usual load).
- **Missed a day:** any day of the shown week (today or earlier), for one child or everyone. Missing one assignment (not a whole day) waits until after the core; the parent makes it up that week or reports it in the last-week check-in.

Each ticket uses the usual format. Build them in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-4.md`.

## Order and dependencies

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S4-01 — Plan an assignment only on its weekdays in the engine](S4-01-plan-an-assignment-only-on-its-weekdays.md) | none | M |
| 2 | [S4-02 — Write migration 009: assignment and subject weekdays](S4-02-write-migration-009-weekdays.md) | none | S |
| 3 | [S4-03 — Accept and return weekdays on the subject endpoints](S4-03-weekdays-on-the-subject-endpoints.md) | S4-02 | S |
| 4 | [S4-04 — Accept and return weekdays on the assignment endpoints](S4-04-weekdays-on-the-assignment-endpoints.md) | S4-02 | S |
| 5 | [S4-05 — Load weekdays into the plan](S4-05-load-weekdays-into-the-plan.md) | S4-01, S4-03, S4-04 | S |
| 6 | [S4-06 — Set default weekdays on the subject form](S4-06-default-weekdays-on-the-subject-form.md) | S4-03 | S |
| 7 | [S4-07 — Pick weekdays on the assignment form](S4-07-pick-weekdays-on-the-assignment-form.md) | S4-04, S4-06 | M |
| 8 | [S4-08 — Add finish-forecast and heavy-week helpers to the engine](S4-08-finish-forecast-and-heavy-week-helpers.md) | S4-01 | S |
| 9 | [S4-09 — Show the weekly briefing on This Week](S4-09-show-the-weekly-briefing-on-this-week.md) | S4-05, S4-08 | M |
| 10 | [S4-10 — Mark a missed day from This Week](S4-10-mark-a-missed-day-from-this-week.md) | none | S |
| 11 | [S4-11 — Tester pass: weekdays, briefing and missed days](S4-11-tester-pass.md) | S4-01 to S4-10 | S |

## Next, once C1 is decided
"Missed a day?" will ask how to make the work up: **make it up this week**, **spread it evenly before the end date** (today's behaviour, and what S4-10 does), or **push the end date back**. The first and last are week adjustments underneath, so they wait for the week-adjust API and decision C1 (ROADMAP.md).
