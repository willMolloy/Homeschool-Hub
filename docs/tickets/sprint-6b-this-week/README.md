# Sprint 6b — A simple This Week

> **Status: approved, not started** (2026-10-31). From Will's review of the This Week screen: "The 'last week' feature is cluttered… I don't understand what the table is conveying… I liked the colored bars that showed up before. Maybe they should each be a button… a check that says 'completed' or 'update status'. Update status can have a small box pop up that allows the user to say whether they got ahead or behind and how they want to handle that." Will asked for it right after Sprint 6. DeeDee has not reviewed it yet.

**Design**
- **No table.** The day-by-day effort table (`PlanDebugView`) leaves This Week; it stays only behind the developer flag (`?debug=1` in a dev build).
- **Pastel bars.** Every scheduled assignment shows as a soft bar in its subject's colour (`usePastels`, as in T-09), with its name and the week's work in the family's own words ("Treasure Island · pages 120–150").
- **This week:** bars per child, plus the week's events. Tapping a bar opens the week adjustment (S6-03) for that assignment.
- **Last week:** the same bars, each with **Completed** (a check) or **Update status**, which opens a small pop-up: got ahead or fell behind, "Got to page ___", then keep the end date or move the end date. One "Everything was completed" button covers the usual case.
- Calm: no chips, sliders or steppers inline; no helper text; 44 px targets; 360 px.

Each ticket uses the usual format. Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-6b.md`. The full visual refresh (new design system, dark mode) still comes in Sprint 8; this sprint uses today's tokens.

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S6b-01 — Take the effort table off This Week](S6b-01-take-the-effort-table-off-this-week.md) | none | XS |
| 2 | [S6b-02 — Show this week as pastel bars per child](S6b-02-show-this-week-as-pastel-bars.md) | S6b-01 | M |
| 3 | [S6b-03 — Check in last week with Completed or Update status](S6b-03-check-in-with-completed-or-update-status.md) | S6b-02 | M |
| 4 | [S6b-04 — Tester pass: This Week](S6b-04-tester-pass.md) | S6b-01 to S6b-03 | S |
