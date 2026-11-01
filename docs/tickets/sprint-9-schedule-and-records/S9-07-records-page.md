# S9-07 — Records: attendance, hours and books

**Source:** Will, 2026-11-01; ROADMAP "Records"; UX review section 5  
**Depends on:** S9-01, S9-06  
**Size:** M

## Goal
A calm Records page: what was done, per child or All children, for a chosen range, with no extra typing.

## Steps
1. A range picker using the family's views (Year, Fall, Spring and custom terms) plus "Custom dates" (DateField).
2. Three big numbers: school days, estimated hours, books finished.
3. Then: attendance by month; hours by subject in subject colours (labelled "estimated from your plan"); the book list (finished, then in progress).
4. All from the plan plus check-ins: school days minus days off; a week marked "didn't get to it" counts as not done; hours = minutes a day × days done.
5. The neutral note: "A record to support your own records. Check your state's requirements." No compliance claims.

## Done when
- For the demo family the numbers match a hand count from the plan for one term; the child switch and range picker work at 360 and 1280 px.

## Tests
- API: a records endpoint (read-only) with totals for a range and child, including missed work and days off. Web: the page, empty state for a new family.
