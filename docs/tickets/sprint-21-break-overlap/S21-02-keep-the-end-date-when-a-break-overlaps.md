# S21-02 — Keep the end date when a break overlaps

**Source:** DeeDee, 2026-11-11. **Depends on:** S21-01. **Size:** S

## Goal

Choosing to keep the end date leaves that date where it is and lets the other weeks carry the overlapping work.

## Context

This is the first of the three choices, and it is what the plan already does when a break is saved with no question. She still has to pick it. The other weeks get a little more on the school days that remain before the same end date.

## Steps

1. When she chooses "keep the end date" for an assignment and confirms, the break is saved and that assignment's end date is unchanged.
2. The days inside the break are not school days for that assignment. The work that would have fallen there is spread over the assignment's other school days before the same end.
3. A partial overlap only pulls out the school days the break actually covers. The days outside the break stay on the plan.
4. A different assignment on the same sheet can take a different choice (S21-03). This ticket covers the keep choice only. If any row is still a push choice, Confirm stays disabled. A sheet where every row is keep can be confirmed.
5. The year bar stays the same length on the calendar and reads heavier on the weeks that absorbed the work.

## Done when

- February off, with "keep the end date" on a book that ends May 21, still ends May 21, and February has none of that book's work.
- A book that only overlaps the first week of February loses that week, not the whole month.

## Tests

- Engine: end date unchanged; units that fell on the overlapped school days are placed on the remaining school days before that end; a partial overlap does not clear days outside the break. Web: confirming keep saves one break and does not send a new end date.

## Out of scope

- Pushing the end back, or picking a day (S21-03).
- Changing a finished or stopped assignment (S21-01 leaves them off the list).
