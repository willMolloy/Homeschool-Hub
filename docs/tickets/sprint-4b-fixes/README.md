# Sprint 4b — Fixes from the Sprint 4 verification

These tickets fix the findings in `docs/reviews/sprint-4-verification.md` (tester, 2026-10-30, at `c98c864`): three Medium (M1–M3) and four of the five Low (L1–L4). L5 (marking today missed on an assignment's last day reports "no school days left") is correct under S4-00's rule and is left as is.

**Approval:** fix tickets from a tester report, per HOW_WE_WORK ("Its findings become fix tickets"), under Will's instruction of 2026-10-30 to finish and test Sprint 4 before Sprint 5. Product calls made by the coordinator are marked "(coordinator's call)" so DeeDee or Will can revisit them.

Each ticket uses the usual format. Build them in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-4b.md`.

| Order | Ticket | Finding | Depends on | Size |
|-------|--------|---------|------------|------|
| 1 | [S4b-01 — The briefing plans from the earliest live start](S4b-01-the-briefing-plans-from-the-earliest-live-start.md) | M1 | none | S |
| 2 | [S4b-02 — A second weekday change in a week keeps the original days](S4b-02-a-second-weekday-change-keeps-the-original-days.md) | M2 | none | XS |
| 3 | [S4b-03 — The briefing reports no recent progress, and caps very late forecasts](S4b-03-no-recent-progress-and-very-late-forecasts.md) | M3 | none | S |
| 4 | [S4b-04 — Editing other fields never changes an assignment's days](S4b-04-editing-other-fields-never-changes-days.md) | L1 | none | XS |
| 5 | [S4b-05 — "Set as default" applies when the form is saved](S4b-05-set-as-default-applies-on-save.md) | L3 | S4b-04 | S |
| 6 | [S4b-06 — Day chips stay 44 px wide for 6- and 7-day weeks](S4b-06-day-chips-stay-44-px-wide.md) | L2 | none | XS |
| 7 | [S4b-07 — "Missed a day?" preselects today](S4b-07-missed-a-day-preselects-today.md) | L4 | none | XS |
