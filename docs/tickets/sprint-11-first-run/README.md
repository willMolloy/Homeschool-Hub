# Sprint 11 — First run

> **Status: approved, building** (Will, 2026-11-05: "Your developer will build. They can start now"). Decisions: `docs/progress/decisions-2026-11-04.md` (first run, 2026-11-05) and ROADMAP "Order of work after Sprint 10". Branch: `claude/test-coverage-analysis-6dehbu` (it also carries the Home fix baf21b7); the PR to `main` comes after the tester passes (HOW_WE_WORK, "Branches").

## Decisions (Will, 2026-11-05)
- A setup flow on a **new** family's first login, one question per screen, progress bar and Back. Steps: family; children (**the only required step**); school days; school year and its shape; breaks (**Add breaks / I'll get back to you on this / Skip**); subjects.
- **No first-assignment step, and no prompt for one afterwards** ("They may want to poke around first"). So Home's checklist drops "Add your books and lessons".
- **Logging setup is not in the flow;** Records asks the first time it is opened (already built, S9-03).
- **Schedule hints, not a tour:** three one-time hints, one at a time, each with "Got it"; "Show tips again" in Family settings.
- Existing families never see the flow. Every skipped step stays editable in Set up.

Build in order, one commit per ticket, each with `bash scripts/check.sh` ALL GREEN. Progress in `docs/progress/sprint-11.md`. Check every screen at 320, 360 and 1280 px in light and dark, 44 px targets.

| # | Ticket | Size |
|---|--------|------|
| 1 | [S11-01 — The setup flow's frame](S11-01-setup-flow-frame.md) | S |
| 2 | [S11-02 — Family, children and school days](S11-02-family-children-days.md) | S |
| 3 | [S11-03 — The school year and its shape](S11-03-school-year-and-shape.md) | M |
| 4 | [S11-04 — Breaks: add, later or skip](S11-04-breaks.md) | S |
| 5 | [S11-05 — Subjects, then Home](S11-05-subjects-then-home.md) | S |
| 6 | [S11-06 — Three one-time hints on Schedule](S11-06-schedule-hints.md) | S |
| 7 | [S11-07 — Docs and a new-family smoke scenario](S11-07-docs-and-smoke.md) | XS |
| 8 | [S11-08 — Tester pass](S11-08-tester-pass.md) | S |
