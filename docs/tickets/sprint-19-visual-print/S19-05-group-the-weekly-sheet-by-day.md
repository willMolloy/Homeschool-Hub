# S19-05 — Group the weekly sheet by day

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** S

## Goal

The printed weekly sheet is grouped by day, Monday and everything on Monday, then Tuesday, and so on.

## Context

The weekly print is built by subject, then by assignment, with a row for each school day under that assignment. She wants the week printed the way the days run. This is the print view only. Schedule · Week still has Bars and Days, and that toggle does not change.

## Steps

1. On the weekly sheet, each school day is a heading in week order, then the work for that day: subject, assignment title, that day's range, and a paper checkbox.
2. A day with nothing planned still says so. A break or day off is one quiet line on that day ("Wednesday · Thanksgiving break"), not a list of breaks at the top of the week.
3. Ranges stay the ones the plan already uses. No minutes and no effort words. One page per child; a full week may flow to a second page rather than shrinking the type.
4. The daily sheet stays a single day. It is not regrouped.
5. **Default, not a blocker:** within a day, keep the family's subject order, then assignment title.

## Done when

- Print preview of a week shows Monday's work together, then Tuesday's, and so on.
- The on-screen Bars / Days toggle looks and behaves as it does now.

## Tests

- Web: for a mid-book assignment, the weekly sheet's Monday lines match that day's plan, Tuesday matches Tuesday, a day off is only on its day, and no minutes appear. The daily sheet is unchanged. The Bars / Days toggle is not part of this change.

## Out of scope

- Redesigning the on-screen Days view.
- Adding minutes to the sheet.
