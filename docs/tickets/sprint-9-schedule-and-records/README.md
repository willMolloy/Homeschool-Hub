# Sprint 9 — Schedule and Records: fixing the two main jobs

> **Status: approved, building** (Will, 2026-11-01: answers to the UX questions and "you can kick off the next dev phase"). Defaults for the four open questions below are the coordinator's, recorded here; Will can overrule.

## The correction

Will, 2026-11-01: "I thought the record/csv page was the other main option besides the schedule on the home page. The 'this week' is an optional feature attached to the schedule functionality to keep it updated."

What we built in Sprint 8 read the earlier answer ("Track work/schedule") as *checking in* being the second job. The intended shape is:

- **Home** has two main options: **Schedule** and **Records**.
- **Schedule** is the plan: Week | Year, steering, and the weekly check-in ("Did everything get done?") as an **optional helper** that keeps the plan up to date. It is not its own tab.
- **Records** is the second main job: what was done, as attendance, hours, a book list and a CSV export, generated from the plan plus check-ins with no extra typing.

This moves Records from "optional module" into the core (ROADMAP, "Optional modules" #1) and replaces Track work as a tab.

## Re-shape (Will, 2026-11-01, later the same day)

"'Did everything get done this week' doesn't make sense to me because it's a record keeping card. Parents may do this every day, week or month. The point is it will allow them to log when they can to keep records and export as csv." CSV: the parent ticks which data to export and picks a date range; no empty or unneeded columns; all data is still kept. "Hours must be manually typed in." Printable summary: yes.

So the weekly check-in becomes **logging inside Records**, done whenever the parent likes (a day, a week, a month). **Rewritten after Will's answers:** S9-02 (retire the check-in card), S9-03 (log setup), S9-07 (log entries), S9-08 (totals), S9-11 (export). Template styles, never state names; work samples and photos held for later (Will). **Building now:** S9-01 (with /records as a placeholder), S9-04, S9-05 (without the check-in item), S9-06. Then S9-09 and S9-10 after the rewrite.

**Logging rules (Will, 2026-11-01):**
- Logging and the schedule are separate: logging never moves the plan, and the plan never fills in a log.
- **Logs are never prefilled** ("we don't want to be responsible for a misentered log"); every value is typed or chosen by the parent.
- Hours are typed by the parent. A log entry counts as a school day by default, with a visible switch the parent can turn off.
- What to log is configurable (Log setup): hours by subject with core/non-core, school days, home vs away hours, notes, books read.
- Wording: made for state records, does not guarantee meeting every state requirement.
- CSV: the parent picks a date range and the columns; no empty columns. Printable summary: yes.

## Tickets

Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress in `docs/progress/sprint-9.md`.

| Order | Ticket | Size |
|-------|--------|------|
| 1 | [S9-01 — Navigation: Home · Schedule · Records](S9-01-navigation-home-schedule-records.md) | S |
| 2 | [S9-04 — A calm date field in US style](S9-04-us-date-field.md) | M |
| 3 | [S9-05 — Home's briefing line, only when something needs you](S9-05-home-briefing-line.md) (without the check-in item) | S |
| 4 | [S9-06 — Fall and Spring can be renamed and re-dated](S9-06-name-and-date-the-term-views.md) | S |
| 5 | [S9-02 — Retire the weekly check-in card](S9-02-retire-the-weekly-check-in.md) | S |
| 6 | [S9-03 — Log setup: choose what to track](S9-03-log-setup.md) | M |
| 7 | [S9-07 — Log entries: typed by the parent, never prefilled](S9-07-log-entries.md) | M |
| 8 | [S9-08 — Records: totals for a range](S9-08-records-totals.md) | M |
| 9 | [S9-11 — Records: export with chosen columns and dates](S9-11-records-export.md) | M |
| 10 | [S9-09 — Docs follow the new shape](S9-09-docs-follow-the-new-shape.md) | XS |
| 11 | [S9-10 — Tester pass](S9-10-tester-pass.md) | S |

Slip rule: the printable summary (part of S9-11) slips first.

## After this sprint

Sprint 10: Year view polish (UX review fixes 4–5 and the Year drift: bar height cap, badges pinned to lanes, Today at the top, whose lane under All children, subject picker and child chips; Will, 2026-11-01). Sprint 11: accounts and hosting hardening.
