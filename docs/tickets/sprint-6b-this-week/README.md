# Sprint 6b — A simple This Week

> **Status: approved, not started** (2026-10-31). From Will's review of the This Week screen: "The 'last week' feature is cluttered… I don't understand what the table is conveying… I liked the colored bars that showed up before. Maybe they should each be a button… a check that says 'completed' or 'update status'. Update status can have a small box pop up that allows the user to say whether they got ahead or behind and how they want to handle that." Will asked for it right after Sprint 6. DeeDee has not reviewed it yet.

**Design**
- **No table.** The day-by-day effort table (`PlanDebugView`) leaves This Week; it stays only behind the developer flag (`?debug=1` in a dev build).
- **Pastel bars.** Every scheduled assignment shows as a soft bar in its subject's colour (`usePastels`, as in T-09), with its name and the week's work in the family's own words ("Treasure Island · pages 120–150").
- **This week:** bars per child, plus the week's events. Tapping a bar opens the week adjustment (S6-03) for that assignment.
- **Last week:** the same bars, each with **Completed** (a check) or **Update status**, which opens a small pop-up: got ahead or fell behind, "Got to page ___", then keep the end date or move the end date. One "Everything was completed" button covers the usual case.
- **Edit bar (Will, 2026-10-31):** Start and End date pickers and Copy only; Heavier, Lighter and Reset to original behind a small "More"; the week-step buttons go.
- **Bar sizes (Will, 2026-10-31):** bars get a soft cap (normal up to a typical day, then growing slowly to a maximum); the assignment form gently flags an unrealistic daily pace.
- **New families and the timeline (Will, 2026-10-31):** the subject dropdown offers common subjects and "New subject…"; an empty timeline still shows the calendar; bars sit closer together (close, never touching).
- Calm: no chips, sliders or steppers inline; no helper text; 44 px targets; 360 px.

Each ticket uses the usual format. Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-6b.md`. The full visual refresh (new design system, dark mode) still comes in Sprint 8; this sprint uses today's tokens.

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S6b-01 — Take the effort table off This Week](S6b-01-take-the-effort-table-off-this-week.md) | none | XS |
| 2 | [S6b-02 — Show this week as pastel bars per child](S6b-02-show-this-week-as-pastel-bars.md) | S6b-01 | M |
| 3 | [S6b-03 — Check in last week with Completed or Update status](S6b-03-check-in-with-completed-or-update-status.md) | S6b-02 | M |
| 4 | [S6b-05 — A simpler timeline edit bar](S6b-05-a-simpler-edit-bar.md) | none | S |
| 5 | [S6b-06 — Soft-cap very thick bars on the timeline](S6b-06-soft-cap-very-thick-bars.md) | none | S |
| 6 | [S6b-07 — A gentle pace check on the assignment form](S6b-07-a-gentle-pace-check-on-the-assignment-form.md) | none | XS |
| 7 | [S6b-08 — Add a subject from the assignment form, with common presets](S6b-08-add-a-subject-from-the-assignment-form.md) | none | S |
| 8 | [S6b-09 — Show an empty calendar when nothing is planned](S6b-09-show-an-empty-calendar.md) | none | S |
| 9 | [S6b-10 — Tighter spacing between bars](S6b-10-tighter-spacing-between-bars.md) | S6b-06 | XS |
| 10 | [S6b-04 — Tester pass: This Week, the edit bar, the timeline and new families](S6b-04-tester-pass.md) | S6b-01 to S6b-03, S6b-05 to S6b-10 | S |
