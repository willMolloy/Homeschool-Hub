# S22-02 — Plan each child to their own end

**Source:** DeeDee, Sprint 22. **Depends on:** S22-01. **Size:** M

## Goal

The plan for a child uses that child's end and that child's finished or stopped state.

## Context

`planChild` already runs once per child, but it reads the assignment's one end and one ending. After S22-01 those values are also on the child, and they match, so this ticket must not move any bar until a child's row differs.

A minutes book is a daily amount. A shorter end for one child must not thicken the other days, and must not change the minutes a day.

## Steps

1. An assignment may carry each child's end and ending. When a child has no row of their own, the assignment's end and ending are used, as they are today.
2. The plan loader sends each child's stored end and ending. While they match the book, the plan is the plan the family already has.
3. A minutes book keeps its minutes a day when one child's end differs. **Default, not a blocker:** the stored total follows the longest child's span. The shorter child's plan places that same daily amount on their own days. Pages, lessons, and chapters keep one total for the book.
4. A child marked finished or stopped is closed on their own day. Another child on the book stays open.

## Done when

- Two children with the same stored end get the same plan they get today.
- Elias ending a month before Margaret shortens only Elias's plan. Margaret's days are unchanged.
- Elias marked finished closes only Elias. Margaret, still open, keeps her plan.
- Piano at 30 minutes a day stays 30 minutes a day for both children when only one end moves.

## Tests

- Engine: a missing per-child schedule matches today's plan; two children with different ends and different endings plan separately; a minutes book does not thicken when one end moves in. API: the plan for a book whose children were copied by the migration matches a plan that never heard of per-child ends.

## Out of scope

- The screen that sets one child's end (S22-03).
- How the year view draws the two ends (S22-06).
