# S6b-02 — Show this week as pastel bars per child

**Source:** Will's review (2026-10-31): "I liked the colored bars… Maybe they should each be a button."  
**Depends on:** S6b-01  
**Size:** M

## Goal
For the current or a coming week, This Week shows each child's scheduled work as pastel bars, one per assignment, and tapping one opens its week adjustment.

## Context
- T-09's check-in rows use pastel subject tints (`features/checkin/usePastels.ts`) and say amounts in the family's units ("pp. 120–150", "lessons 4–7"); reuse that wording (`checkinText.ts`, `childWeek.ts`).
- The week adjustment sheet is `features/plan/WeekAdjustment.tsx` (S6-03).

## Steps
1. Per child (child name as a small heading), list one bar per assignment with work planned in the shown week: a soft rounded bar in the subject's pastel tint, the assignment title and the week's range in its units. Order by subject lane order.
2. Below the bars, the week's events for that child in one quiet line each ("Tue · Co-op").
3. Tapping a bar opens the week adjustment sheet focused on that assignment (other rows still reachable). Keep a per-child "Adjust this week" button for keyboard and screen-reader users, or make each bar a button with a clear name ("Adjust Treasure Island this week").
4. A child with nothing planned that week shows "Nothing planned this week."

## Done when
- The demo family's current week shows each child's assignments as pastel bars with their page or lesson ranges, and tapping one opens its adjustment.
- 360 px; 44 px bars; no numbers other than the units; only what's essential.

## Tests
- Web: bars per child in lane order with the right ranges; events listed; tapping opens the sheet for that assignment; empty child message; accessible names.

## Out of scope
- Last week (S6b-03); the timeline.
