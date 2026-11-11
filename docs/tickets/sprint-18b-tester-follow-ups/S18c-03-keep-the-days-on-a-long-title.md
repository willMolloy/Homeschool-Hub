# S18c-03 — Keep the days on a long year-view title

**Source:** L3 (Low) from the independent tester's READY pass on PR #20, tested head `d565cf24035c72a715650570bfb5039dbedb8070`. **Depends on:** S18b-02, merged. **Size:** S. This file does not build it. Build it after Sprint 21.

## Goal

On the Year view at 360 px, a long title does not hide the days that tell two copies of a book apart.

## Context

S18b-02 adds the days to a year bar when the book has another open workbook ("Gospel of Luke · Tue–Fri"). Shorter titles show those days on screen. Longer ones are cut first: "The Hobbit (read alou…" and "Poetry and Psalm 2…" lose " · Mon–Thu" or " · Tue–Fri" before the days are drawn, in the Together lane and in Wren's lane. On screen those copies are then told apart only by which lane they sit in. The accessible name and the edit sheet still carry the days ("Literature · Elias · Mon–Thu").

## Steps

1. At 360 px, Schedule › Year › All children, a bar that has a days suffix still shows that suffix when the title is long. The title may shorten. The days may not.
2. A short title that already shows its days still does. A book with no other workbook still has no days suffix.
3. The accessible name keeps the days, as it does now.

## Done when

- At 360 px, "The Hobbit (read aloud)" and the long poetry title show their days on the year bar, not only in the accessible name.
- Books with no twin are unchanged.

## Tests

- Web: a year bar whose title is too long for 360 px keeps the days suffix visible, and a book with no twin does not gain one. At 1280 px the full title and the days both fit when they fit today.

## Out of scope

- Changing which books count as copies (S18c-01). If that ticket later drops a twin, this ticket's suffix goes with it.
- Rewriting how lanes group children.
- The other findings in this folder.
