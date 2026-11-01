# Sprint 9 — Schedule and Records: fixing the two main jobs

> **Status: approved, building** (Will, 2026-11-01: answers to the UX questions and "you can kick off the next dev phase"). Defaults for the four open questions below are the coordinator's, recorded here; Will can overrule.

## The correction

Will, 2026-11-01: "I thought the record/csv page was the other main option besides the schedule on the home page. The 'this week' is an optional feature attached to the schedule functionality to keep it updated."

What we built in Sprint 8 read the earlier answer ("Track work/schedule") as *checking in* being the second job. The intended shape is:

- **Home** has two main options: **Schedule** and **Records**.
- **Schedule** is the plan: Week | Year, steering, and the weekly check-in ("Did everything get done?") as an **optional helper** that keeps the plan up to date. It is not its own tab.
- **Records** is the second main job: what was done, as attendance, hours, a book list and a CSV export, generated from the plan plus check-ins with no extra typing.

This moves Records from "optional module" into the core (ROADMAP, "Optional modules" #1) and replaces Track work as a tab.

## Tickets

Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress in `docs/progress/sprint-9.md`.

| Order | Ticket | Size |
|-------|--------|------|
| 1 | [S9-01 — Navigation: Home · Schedule · Records](S9-01-navigation-home-schedule-records.md) | S |
| 2 | [S9-02 — The check-in lives in Schedule · Week](S9-02-check-in-lives-in-schedule.md) | M |
| 3 | [S9-03 — The check-in can be turned off](S9-03-check-in-can-be-turned-off.md) | S |
| 4 | [S9-04 — A calm date field in US style](S9-04-us-date-field.md) | M |
| 5 | [S9-05 — Home's briefing line, only when something needs you](S9-05-home-briefing-line.md) | S |
| 6 | [S9-06 — Fall and Spring can be renamed and re-dated](S9-06-name-and-date-the-term-views.md) | S |
| 7 | [S9-07 — Records: attendance, hours and books](S9-07-records-page.md) | M |
| 8 | [S9-08 — Records: export CSV and a printable summary](S9-08-records-export.md) | S |
| 9 | [S9-09 — Docs follow the new shape](S9-09-docs-follow-the-new-shape.md) | XS |
| 10 | [S9-10 — Tester pass](S9-10-tester-pass.md) | S |

Slip rule: the printable summary (part of S9-08) slips first.

## Open questions: coordinator defaults (Will can overrule)

1. **Check-in when it's on:** default: stays until answered (Will's 2026-10-31 decision); turning it off is the escape (S9-03).
2. **Records date ranges:** default: the family's views (Year, Fall, Spring, custom terms, renamable per S9-06) plus custom dates; no separate school-year dates.
3. **Hours:** default: estimated from the plan and labelled as estimates; typed actual hours wait until a family asks.
4. **Printable summary:** default: in this sprint as a print stylesheet (S9-08), first to slip.

## After this sprint

Sprint 10: Year view polish (UX review fixes 4–5 and the Year drift: bar height cap, badges pinned to lanes, Today at the top, whose lane under All children, subject picker and child chips; Will, 2026-11-01). Sprint 11: accounts and hosting hardening.
