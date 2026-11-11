# S18c-01 — Other copies are the workbooks running at the same time

**Source:** M1 (Medium) from the independent tester's READY pass on PR #20, tested head `d565cf24035c72a715650570bfb5039dbedb8070`. **Depends on:** Sprint 18b merged. **Size:** S. This file does not build it. Build it after Sprint 21.

## Goal

"Other copies" lists only the other workbooks of that book that are running at the same time, and two copies with the same child and the same days can be told apart by their dates.

## Context

Sprint 18b (S18b-02) treats two open assignments as copies of one book when the subject matches and the title matches, ignoring a trailing " (copy)". An archived row is not a copy. The days are then added to the card and the year bar, and the edit form lists the other copy with "This week's amount", "Update status", and "Did {name} finish?".

That match ignores dates. "Copy to a new year" makes next year's book with the same subject and title, so this year's book lists it as another copy. After a full new-year copy, every book would show Other copies and a days suffix.

The tester's suggested fix: count only copies whose dates overlap (or that are in the same school year), and add the dates to the label when the child and the days are the same.

**Default, not an open question:** use overlapping dates. A copy counts when its start-to-end range shares a day with this one. "Same school year" was the tester's other wording for the same idea; it is not a second rule. Two books in one school year whose dates do not overlap are not copies of each other for this list.

### Repro (tester, today Thu Nov 5, 2026, Hartley family, 360 px)

1. Sign in as Rachel. Go to Set up › Assignments › Copy to a new year.
2. Enter "Aug 17, 2026" as this year's first day and "Aug 16, 2027" as next year's first day. Tap Untick all, tick only Treasure Island, then tap Copy (1). It shows "Copied 1 assignment to 2027–28."
3. Open this year's Treasure Island.

- Expected: Other copies lists only a separate workbook for another schedule, meaning one running at the same time. A listed copy can be told apart from this one.
- Actual: the edit form shows Other copies, "Elias · Mon–Fri", and This week's amount, Update status, and "Did Elias finish?" for next year's copy. The child and the days match, so nothing tells the years apart. Both cards read "Literature · Elias · Mon–Fri", and only the date line differs. Update status on that copy says "There is nothing to update yet: Treasure Island wasn't planned in the last finished week."
- Screenshots from the pass: this year's Treasure Island with next year's copy under Other copies, and Update status on that copy.

## Steps

This ticket is the work. It is not done by writing this file.

1. A workbook counts as another copy only when it is the same book (today's match: same subject, same title, a trailing " (copy)" ignored, not archived) and its dates overlap this one's. Next year's Treasure Island, shifted by Copy to a new year, does not overlap, so it is not listed.
2. The days suffix on the Assignments card and on the year bar uses that same list. A book whose only twin is next year's copy shows no days suffix.
3. When a listed copy has the same children and the same days as the one on screen, the label adds the dates, so "Elias · Mon–Fri" is not the whole label. **Default, not a blocker:** append the copy's own start and end, in the app's usual date words ("Elias · Mon–Fri · Aug 16, 2027 – May 28, 2028"). When the child or the days already differ, keep today's label ("Wren · Tue–Fri").
4. Update status, this week's amount, and the finish question are offered only for a copy that still counts. They still change only that copy.
5. Two open workbooks of the same book whose dates do overlap, such as the Hartley seed's shared Hobbit and Wren's Tuesday-to-Friday Hobbit, still count. Their labels stay as they are when the child or the days differ.

## Done when

- This year's Treasure Island, after the repro, shows no Other copies for the 2027–28 copy, and its card and year bar do not gain a days suffix from that copy.
- A same-time copy with the same child and the same days is labeled with its dates as well as the child and the days.
- Wren's Hobbit and the shared Hobbit still list each other, and updating one still leaves the other unchanged.

## Tests

- Web: two assignments with the same subject and title whose dates do not overlap are not `otherCopies` of each other, and a days suffix is not added from that pair. Two whose dates overlap still are. When the children and the days match, the row label includes both dates. The repro's new-year Treasure Island is absent from this year's Other copies. Light and dark are not required for the matching helper; the form still renders the label.

## Out of scope

- Building this inside Sprint 19, 20, or 21.
- L1, L3, and L4 (the other files in this folder).
- L2. Opening this week's amount on the other child's whole week stays as Sprint 18b recorded it.
- A per-child end date, or a finish question that forks one shared assignment. That was only discussed. It is not decided, and it is not part of this ticket.
- Changing Copy to a new year itself, or how a copy's dates are shifted.
