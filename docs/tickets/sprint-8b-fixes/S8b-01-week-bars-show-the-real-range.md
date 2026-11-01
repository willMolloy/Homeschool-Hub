# S8b-01 — Week bars show the real range

**Finding:** S8 tester N1 (High): Math 5 reads "lessons 1-5" where Track work says 31-35; Late Reader reads "pages 1-48" at about page 110. `plannedRangeForWeek` only sees the one week the Week view asks the plan for.  
**Depends on:** none  
**Size:** S

## Goal
A Week bar's range is the same as Track work's for the same week.

## Steps
1. Give the Week view the units done before the week (plan from the assignment's start, or the plan's cumulative count), so the range starts where the book really is.
2. Use one shared helper for Week bars and Track work.

## Done when
- In the demo family, Math 5 and Late Reader read the same range on Schedule · Week and Track work.

## Tests
- Web: a mid-book assignment's Week bar range matches the Track work range; an assignment starting this week starts at 1.

## Out of scope
- New wording.
