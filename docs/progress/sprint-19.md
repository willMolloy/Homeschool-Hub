# Sprint 19 progress: visual and print polish

Branch: `hh2/sprint-19`, cut from `main` at the Sprint 18b merge (`a9fcf0d`, tested head `d565cf2`). Tickets: `docs/tickets/sprint-19-visual-print/`. The Sprint 18b tester follow-ups in `docs/tickets/sprint-18b-tester-follow-ups/` are not part of this sprint. Sprints 20 and 21 stay ticketed and unbuilt. Hosting stays on hold. S19-07 is the independent tester's pass and is not part of this build.

| Ticket | Commit | Notes |
|---|---|---|
| S19-01 Keep the date picker on screen | 46cd7e0 | The calendar is portaled onto the page (`placeCalendar`) and shifted so the whole month, including Today, stays inside the viewport. It opens upward when there is no room below. A press on it does not close the sheet. |
| S19-02 Match the Records card to Schedule | d951efe | From 840 px the two cards share one grid row and stretch to the same height. The checklist stays under Records. Under 840 px each card is only as tall as its content. |
| S19-03 Make Log an action | 71e8ecd | Log is a secondary button, the same treatment as Export. It is not pressed and not a chip. It still opens the log sheet. |
| S19-04 Let bar thickness show the load | 8670aee | `BAR_CURVE` is 0.45 (was 1.5). `VIEW_MAX_PERCENTILE` stays 0.95. A steady 40 min/day (thickness 20) is at least 1.5 times thinner than a steady 150 min/day (thickness 75) at Year, Fall, and This month, for one child and for all children. One heavy week does not flatten that pair. The painted bar mixes 8% of the base strong tone into the pastel (`BAR_STRONG_MIX`). Opacity stays 1. Inside names still meet AA in light and dark, including on a dimmed bar. This commit is shared with S19-06 because both change `layout.ts` and `Timeline.tsx`. The tester fixes below raise the cap for a lopsided year and stop ended bars painting black. |
| S19-05 Group the weekly sheet by day | 62f62a9 | The weekly sheet lists each school day, then that day's work in subject order: subject, title, that day's range, a paper checkbox, on one line. A day with nothing says "Nothing planned." A break is one quiet line on its day ("Monday · Thanksgiving break"). No minutes. The daily sheet is unchanged. The on-screen Bars / Days toggle is unchanged. The tester fix below keeps a heavy week to two Letter pages. |
| S19-06 Leave the usual days off off the year view | 8670aee | Regular weekly offs (weekdays that are not school days) are not columns on Year or on a term zoom, and they have no label. This month, and any view of five weeks or less, gives them a column and still no label. There is no "Wednesdays off" text. A break of 7 calendar days or more will not save without a name (`isLongBreak`), and the year view draws that name. A shorter unnamed break keeps its kind name ("Break", "Holiday", "Sick day"). Same commit as S19-04. The tester fix below places the name where it can be read. |
| S19-07 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-19-verification.md`. |

## Decisions

- **S19-01 the calendar overlays the page.** A sheet clips anything inside it, so the grid is drawn on the page, above the sheet (`--z-overlay`). Prefer-up is still the bottom edit bar's request. The date that is saved is unchanged.
- **S19-02 stretch, no filler.** The Records card grows to the Schedule card's row. Nothing new is drawn in the extra space. On a phone the cards stack.
- **S19-03 the empty-state Log is the same button.** It is secondary too, so a family with no entries does not see a selected tab.
- **S19-04 curve 0.45, mix 8%.** 0.45 is closer to a straight line than 1.5 and still lifts a light load a little (the old "above a straight line" check still holds). 8% of the strong tone is the most that keeps every inside name at AA on the darker child step. Opacity stays 1. Stored minutes and weights are unchanged. Thickness for a minutes-a-day load is still minutes ÷ 2.
- **S19-04 the cap can rise above the 95th percentile.** `scaledViewMax` is the 95th percentile of the loads in the view, raised toward the peak but not past twice that percentile (`VIEW_MAX_SPREAD`). A year whose days are mostly near an hour still separates a 40-minute book from a 150-minute one. A uniformly light plan is unchanged, because its peak is the percentile. The ribbon scale stays on the raw percentile.
- **S19-04 changed expectations.** Bar fills are `color-mix` of the strong tone into the pastel. At This month the regular days off are columns, so a day's piece is narrower and a name that no longer fits sits above the row (S17-01's month-name checks).
- **S19-05 the day heading is the full name** ("Monday"), and the break line repeats it ("Monday · Thanksgiving break"). Within the day, subject order then title. The daily sheet still groups by subject.
- **S19-06 "a month or closer" is five weeks.** Year never draws the regular offs. Fall and Spring of a normal year are wider than that, so they don't either. A view the family has dated down to five weeks or less does. This month always does.
- **S19-06 a long break's name is required on save,** in the form and on the API ("A break of a week or longer needs a name."). A shorter break may still be blank. A template that would save a week or longer with no name of its own stores the kind's name, so the year view has a title. Viewing an old unnamed long break does not ask; saving it does.
- **S19-06 the title sits below the sticky headers.** It is drawn under the month axis and under that group's sticky header (Together, for a family-wide break). If it would run past the plot, it shifts left and, when it still does not fit, truncates with "…". The band still spans the dates.

## Tester fixes

The independent tester marked `e78c641` not ready: 2 High, 2 Medium, 3 Low. The fixes are `ae59a92`, on the same branch. S19-07's verification report is still the tester's to write.

| Finding | What changed |
|---|---|
| H1 Ended bars painted black | The fill mixed in `--tl-subject-N-light-strong`, which is not a token, so the browser used black and the name on it failed at 360 px in the light theme. The mix now uses the base `--tl-subject-N-strong`, which exists for every subject, into the step's own fill. Ended bars stay the muted subject colour. A test checks that every variable `bandFill` names is defined for subjects 1–12 and for the base, light, and dark steps, in both themes. |
| H2 Long-break titles were hidden | A family title was drawn under the sticky month axis or the sticky Together header. A one-child title ran off the right edge at 360 and 440 px. The title is placed below both sticky bars, then shifted and truncated so it stays inside the plot. Checked at 360, 440, and 1280, in light and dark, for a family break and for one child. |
| M1 40 minutes was not 1.5× thinner in a seed-like year | The 95th percentile sat near 60 min/day, so a 150-minute book drew as thick as about 55. The cap now rises toward the peak, at most twice the percentile. A test uses twenty books near 56 minutes plus one at 40 and one at 150, at Year and Fall, at 390 and 1280. |
| M2 A week printed on three Letter pages | The weekly sheet had a heading per subject as well as a line per assignment. The subject now shares the assignment's line, and the print rhythm is tighter. A week of five days with 12 lines a day stays within two Letter pages. The day name on a break line is unchanged. |
| L2 The calendar was hard to reach and outside a landmark | Opening it moves focus to the selected day (or Today). The grid is a dialog named Calendar. |
| L3 The calendar stayed put while its sheet scrolled | A scroll or a resize follows the field. When the field leaves the screen, the calendar closes. |
| L1 The day name repeated on a break line | Left as it was. "Monday · Thanksgiving break" is the line the sheet is meant to print. |

## Gate counts

`bash scripts/check.sh` on this branch, ALL GREEN.

| | engine | API | web | db |
|---|---|---|---|---|
| Sprint 19, before the tester fixes | 437 | 1208 | 1787 | 190 |
| After the tester fixes | 437 | 1208 | 1792 | 190 |

Engine tests also passed in the time-zone run. Web grew by the new ticket tests (it was 1765 at the Sprint 18b head), then by five regression tests for the tester fixes.
