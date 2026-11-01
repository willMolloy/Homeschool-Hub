# S7b-10 — "Minutes a day" counts the days the work really happens

**Finding:** independent review F-03 (High): the form's pace ("About 4.6 pages a day") counts every weekday in the range, ignoring breaks, days off, event skips and the assignment's own weekdays; the plan then places the work on fewer days (7.6 pages a day, about 50 min instead of the chosen 30), while the list still says "about 30 min a day".  
**Depends on:** S7b-09  
**Size:** M

## Goal
"About N {units} a day" and the minutes a parent picks are computed over the days the plan will actually use, so 30 min a day means 30 min on the days the child does it.

## Context
- `effort.ts` `schoolDaysBetween` counts weekdays only. The engine's capacity model (`buildCapacityModel`) knows school days, days off, events and assignment weekdays.

## Steps
1. Add an engine helper that counts an assignment's capacity days between two dates for a child (school days and the assignment's weekdays, minus days off, with event skip and lighter factors), and use it in the API for one preview call (for example `POST /api/plan/pace` with the draft's dates, days, children and subject, returning capacity days per child).
2. The form's pace line and the minutes ↔ weight conversion use those capacity days (for several children, the smallest, and say so if they differ).
3. Cards and hints ("about N min a day") use the plan's own rate the same way.

## Done when
- The review's case (Nov 2 – Jan 29 with Thanksgiving, Christmas and a Tuesday co-op skip): the form shows about 7.6 pages a day, picking 30 min stores the weight that gives 30 min on those days, and the list says about 30 min a day.

## Tests
- Engine: capacity days with breaks, skips and weekdays. API: the pace endpoint. Web: the pace line and the stored weight for the review's case.

## Out of scope
- Changing how the plan places work.
