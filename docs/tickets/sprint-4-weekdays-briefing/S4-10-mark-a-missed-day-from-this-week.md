# S4-10 — Mark a missed day from This Week

**Source:** ROADMAP.md, "\"Missed a day?\" on This Week"; Will's answers (any day of the week, one child or everyone)  
**Depends on:** S4-00  
**Size:** S

## Goal
From This Week, a parent marks a day missed for one child or everyone in two taps, and the plan reflows at once.

## Context
- A missed day is a day off underneath: `POST /api/blocked-ranges` with `kind`, `startDate = endDate`, and `childIds` (empty = everyone). The engine then spreads that day's work over the remaining days and keeps end dates.
- The demo family's write rules apply as for days off.

## Steps
1. Add a "Missed a day?" button on This Week. It opens a small sheet (`ResponsiveSheet`): pick a day of the shown week up to today (school days only), and who missed it (each child, or Everyone, default Everyone).
2. Save creates a day off with `kind: "missed"` (from S4-00), for the chosen child or everyone, labelled "Missed day". The plan refreshes, and the day's work moves forward (S4-00's rule), not backward.
3. A day already fully off for that child (or everyone) isn't offered.
4. To undo, the day appears under Days off as usual (undo proper is C2).

## Done when
- Marking Tuesday missed for one child moves that child's Tuesday work to later days (the position before Tuesday is unchanged) and leaves the other children unchanged.
- Future days aren't offered; 44 px targets; only what's essential.

## Tests
- Web: the sheet offers only school days up to today in the shown week; saving posts the right body for one child and for everyone; the plan reloads; a day already off isn't offered.

## Out of scope
- Choosing how to make the work up (make it up this week / push the end date back): that needs week adjust (C1). See this sprint's README, "Next".
- Missing one assignment instead of a whole day (after the core).
