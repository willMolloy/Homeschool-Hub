# Sprint 19 progress: visual and print polish

Branch: `hh2/sprint-19`, cut from `main` at the Sprint 18b merge (`a9fcf0d`, tested head `d565cf2`). Tickets: `docs/tickets/sprint-19-visual-print/`. The Sprint 18b tester follow-ups in `docs/tickets/sprint-18b-tester-follow-ups/` are not part of this sprint. Sprints 20 and 21 stay ticketed and unbuilt. Hosting stays on hold. S19-07 is the independent tester's pass and is not part of this build.

| Ticket | Commit | Notes |
|---|---|---|
| S19-01 Keep the date picker on screen | 46cd7e0 | The calendar is portaled onto the page (`placeCalendar`) and shifted so the whole month, including Today, stays inside the viewport. It opens upward when there is no room below. A press on it does not close the sheet. |
| S19-02 Match the Records card to Schedule | d951efe | From 840 px the two cards share one grid row and stretch to the same height. The checklist stays under Records. Under 840 px each card is only as tall as its content. |
| S19-03 Make Log an action | 71e8ecd | Log is a secondary button, the same treatment as Export. It is not pressed and not a chip. It still opens the log sheet. |
| S19-04 Let bar thickness show the load | 8670aee | `BAR_CURVE` is 0.45 (was 1.5). `VIEW_MAX_PERCENTILE` stays 0.95. A steady 40 min/day (thickness 20) is at least 1.5 times thinner than a steady 150 min/day (thickness 75) at Year, Fall, and This month, for one child and for all children. One heavy week does not flatten that pair. The painted bar mixes 8% of the strong tone into the pastel (`BAR_STRONG_MIX`). Opacity stays 1. Inside names still meet AA in light and dark, including on a dimmed bar. This commit is shared with S19-06 because both change `layout.ts` and `Timeline.tsx`. |
| S19-05 Group the weekly sheet by day | 62f62a9 | The weekly sheet lists each school day, then that day's work in subject order: subject, title, that day's range, a paper checkbox. A day with nothing says "Nothing planned." A break is one quiet line on its day ("Thursday · Thanksgiving break"). No minutes. The daily sheet is unchanged. The on-screen Bars / Days toggle is unchanged. |
| S19-06 Leave the usual days off off the year view | 8670aee | Regular weekly offs (weekdays that are not school days) are not columns on Year or on a term zoom, and they have no label. This month, and any view of five weeks or less, gives them a column and still no label. There is no "Wednesdays off" text. A break of 7 calendar days or more will not save without a name (`isLongBreak`), and the year view draws that name, above the band when the band is too narrow. A shorter unnamed break keeps its kind name ("Break", "Holiday", "Sick day"). Same commit as S19-04. |
| S19-07 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-19-verification.md`. |

## Decisions

- **S19-01 the calendar overlays the page.** A sheet clips anything inside it, so the grid is drawn on the page, above the sheet (`--z-overlay`). Prefer-up is still the bottom edit bar's request. The date that is saved is unchanged.
- **S19-02 stretch, no filler.** The Records card grows to the Schedule card's row. Nothing new is drawn in the extra space. On a phone the cards stack.
- **S19-03 the empty-state Log is the same button.** It is secondary too, so a family with no entries does not see a selected tab.
- **S19-04 curve 0.45, mix 8%.** 0.45 is closer to a straight line than 1.5 and still lifts a light load a little (the old "above a straight line" check still holds). 8% of the strong tone is the most that keeps every inside name at AA on the darker child step. Opacity stays 1. Stored minutes and weights are unchanged. Thickness for a minutes-a-day load is still minutes ÷ 2.
- **S19-04 changed expectations.** Bar fills are `color-mix` of the strong tone into the pastel. At This month the regular days off are columns, so a day's piece is narrower and a name that no longer fits sits above the row (S17-01's month-name checks).
- **S19-05 the day heading is the full name** ("Monday"), and the break line repeats it ("Monday · Thanksgiving break"). Within the day, subject order then title. The daily sheet still groups by subject.
- **S19-06 "a month or closer" is five weeks.** Year never draws the regular offs. Fall and Spring of a normal year are wider than that, so they don't either. A view the family has dated down to five weeks or less does. This month always does.
- **S19-06 a long break's name is required on save,** in the form and on the API ("A break of a week or longer needs a name."). A shorter break may still be blank. A template that would save a week or longer with no name of its own stores the kind's name, so the year view has a title. Viewing an old unnamed long break does not ask; saving it does.

## Gate counts

`bash scripts/check.sh` on this branch, ALL GREEN.

| | engine | API | web | db |
|---|---|---|---|---|
| Sprint 19 | 437 | 1208 | 1787 | 190 |

Engine tests also passed in the time-zone run. Web grew by the new ticket tests (it was 1765 at the Sprint 18b head).
