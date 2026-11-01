# S9-08 — Records: totals for a range

**Source:** Will, 2026-11-01; UX review section 5  
**Depends on:** S9-06, S9-07  
**Size:** M

## Goal
Records shows what was logged, per child or All children, for a chosen range, using only the fields the family tracks.

## Steps
1. A range picker: the family's views (Year, Fall, Spring and custom terms, S9-06) plus custom dates.
2. Big numbers for the tracked fields only (school days, total hours, core / non-core hours, home hours, books).
3. Below: hours by subject (subject colours), then the entries list (date, child, summary), newest first.
4. The wording, on Records and every export: "Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules."
5. Empty state for a family with no entries: one line and the Log button.

## Done when
- The S9-07 example shows the right totals for "This week", "Fall" and a custom range, for one child and for All children.

## Tests
- API: a read-only totals endpoint (range, child) from log entries only. Web: only tracked fields shown; empty state.
