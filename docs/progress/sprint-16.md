# Sprint 16 progress — the week, day by day, and clearer Records

Branch: `claude/sprint-16-week-days`, cut from `claude/test-coverage-analysis-6dehbu` (Sprint 15, PR #13 not yet merged) on 2026-11-05 with Will's permission ("If I haven't approved the pr after 30 minutes create a new branch and proceed with sprint 16"). After PR #13 merges, `main` is merged into this branch and its PR is retargeted to `main`. Tickets: `docs/tickets/sprint-16-week-days/`.

| Ticket | Commit | Notes |
|---|---|---|
| S16-01 The Days view | 3400621 | **Web only.** `features/week/daysModel.ts` builds the days **out of `buildSheet`** (the printed weekly sheet's own model), so a day's lines and ranges are the sheet's rows by construction, S15-06's whole-unit ranges included; `DaysView.tsx` draws them (a section per school day: "Mon, Nov 2", a load bar, one line per assignment: subject icon, title with "…", range; minutes show the title only). A line opens what a Week bar opens (a parent: the week adjustment; a viewer: the read-only detail; a finished week: Update status). Days off and breaks are one quiet line; "Nothing planned" otherwise; a stopped assignment has no lines after `endedOn`. Under All children each line has the child's initial in their colour (the sr-only child name follows the visible text); one child: no marker. `useWeekLayout` holds the layout (Bars default, `?layout=days`, remembered in `hh.week.layout`); the toggle itself is S16-02. Phone: stacked; from 840 px: equal columns (`--days` columns, range under the title). Tests: web `s16-01-days-view.test.tsx` (9), including **Days equals the printed `/print/week` rows for All children, child by child**. **Changed expectations:** none |
| S16-02 The Bars \| Days toggle and All children markers | (this commit) | A Segmented **Bars \| Days** ("Week layout", 72 px minimum width, 44 px high) in its own row under the Week header and above the child switch; Bars is the default; the choice is saved in `hh.week.layout` (try/catch, so blocked storage just does not remember) and `?layout=` in the address wins. It stays when the week or child changes and is on finished weeks and for viewers too. Markers were built in S16-01 (the initial in the child's colour under All children with two or more children shown; none with one child). Narrow columns (840 to ~1000 px, about 134 px a column) let a title wrap to two lines and a range wrap, so nothing overflows. Browser check (Playwright Chromium on 127.0.0.1, the demo family, Frank): 320, 360, 840, 1280 px, light and dark: no sideways scroll, every control 44 px or more, columns 280/320/134/222 px. Tests: web `s16-02-toggle-markers.test.tsx` (9: toggle, memory after a reload, blocked storage, markers, one child, viewer toggle and Days, viewer detail has only Close and only allow-listed GETs, viewer finished week). **Changed expectations:** none; one CSS-contrast rule needed `.day-load i` to name its text colour |

## Decisions

- **S16-01 one rule for screen and paper:** Days reads `buildSheet`, it does not recompute ranges. The comparison test renders both the Days view and `/print/week` for the same week and compares (child, day, title, range) sets.
- **S16-01 the load bar** is the day's total effort (`DayLoad.thickness`, summed over the children shown) against the week's busiest day, so it shows the shape of the week, not an amount; it is `aria-hidden` and has no numbers. (A flat week shows every bar full.)
- **S16-01 the content column is widened from 840 px for Days** (`.shell-main:has(.days-grid)`, like Year): the 640 px cap would leave five columns of about 120 px.
- **S16-01 events ("Tue · Co-op") are not on Days:** the ticket lists none; they stay on the Bars view.
- **S16-01 a day that is off for one child under All children** adds a quiet "Frank · Dentist" line beside the other child's work; if every shown child is off, the day is one line (names joined once).
- **S16-01 a finished (past) week** can also be shown as Days (same plans as the print sheet); a line opens Update status as its bar does.
- **S16-01 `ChildPlan` days after `endedOn`** are dropped through `buildSheet` (the sheet already does) and from the load sum.

- **S16-02 the toggle is its own row,** not beside the week arrows: Week | Year, the arrows and a third control do not fit at 360 px, and the ticket allows wrapping.
- **S16-02 `?layout=` beats the saved choice** (like `?view=`), so a link can open either; picking a layout sets both.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S16-01 | 437 | 1189 | 1585 | 180 |
| S16-02 | 437 | 1189 | 1594 | 180 |
