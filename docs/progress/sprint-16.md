# Sprint 16 progress — the week, day by day, and clearer Records

Branch: `claude/sprint-16-week-days`, cut from `claude/test-coverage-analysis-6dehbu` (Sprint 15, PR #13 not yet merged) on 2026-11-05 with Will's permission ("If I haven't approved the pr after 30 minutes create a new branch and proceed with sprint 16"). After PR #13 merges, `main` is merged into this branch and its PR is retargeted to `main`. Tickets: `docs/tickets/sprint-16-week-days/`.

| Ticket | Commit | Notes |
|---|---|---|
| S16-01 The Days view | (this commit) | **Web only.** `features/week/daysModel.ts` builds the days **out of `buildSheet`** (the printed weekly sheet's own model), so a day's lines and ranges are the sheet's rows by construction, S15-06's whole-unit ranges included; `DaysView.tsx` draws them (a section per school day: "Mon, Nov 2", a load bar, one line per assignment: subject icon, title with "…", range; minutes show the title only). A line opens what a Week bar opens (a parent: the week adjustment; a viewer: the read-only detail; a finished week: Update status). Days off and breaks are one quiet line; "Nothing planned" otherwise; a stopped assignment has no lines after `endedOn`. Under All children each line has the child's initial in their colour (the sr-only child name follows the visible text); one child: no marker. `useWeekLayout` holds the layout (Bars default, `?layout=days`, remembered in `hh.week.layout`); the toggle itself is S16-02. Phone: stacked; from 840 px: equal columns (`--days` columns, range under the title). Tests: web `s16-01-days-view.test.tsx` (9), including **Days equals the printed `/print/week` rows for All children, child by child**. **Changed expectations:** none |

## Decisions

- **S16-01 one rule for screen and paper:** Days reads `buildSheet`, it does not recompute ranges. The comparison test renders both the Days view and `/print/week` for the same week and compares (child, day, title, range) sets.
- **S16-01 the load bar** is the day's total effort (`DayLoad.thickness`, summed over the children shown) against the week's busiest day, so it shows the shape of the week, not an amount; it is `aria-hidden` and has no numbers. (A flat week shows every bar full.)
- **S16-01 the content column is widened from 840 px for Days** (`.shell-main:has(.days-grid)`, like Year): the 640 px cap would leave five columns of about 120 px.
- **S16-01 events ("Tue · Co-op") are not on Days:** the ticket lists none; they stay on the Bars view.
- **S16-01 a day that is off for one child under All children** adds a quiet "Frank · Dentist" line beside the other child's work; if every shown child is off, the day is one line (names joined once).
- **S16-01 a finished (past) week** can also be shown as Days (same plans as the print sheet); a line opens Update status as its bar does.
- **S16-01 `ChildPlan` days after `endedOn`** are dropped through `buildSheet` (the sheet already does) and from the load sum.

