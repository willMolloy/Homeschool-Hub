# S22-07 — Ask about a break for each child's end

**Source:** DeeDee, Sprint 22. **Depends on:** S22-03. **Size:** M

## Goal

When a break overlaps a shared book, keep, push-back, and pick follow each child's own end once those ends differ.

## Context

Sprint 21 lists a shared book as one row and says the end moves for everyone on it. DeeDee kept that for one break at a time, a picked day that is a family school day, and "Use this for the rest" using each row's own push-back day. This ticket keeps those rules and applies them per child when the ends are not the same.

## Steps

1. While every open child on the book has the same end, the sheet stays one row. The note still says the end moves for everyone on the book. Confirming push, keep, or pick updates every open child.
2. When the open children's ends differ, the sheet has one row per open child who is actually covered. The row names the child. Push walks that child's school days from that child's end. Keep leaves that child. A picked day becomes that child's end.
3. A child who is already finished or stopped is not a row, and their end does not move, even when a sibling is pushed.
4. A picked day is still a family school day, after the break and after the book's start, and not a day already off. The same refusals as Sprint 21.
5. "Use this for the rest" fills each unanswered row with that row's own push-back day, not a date typed on another row.
6. One break per save. A partial overlap still counts, for the child whose days it covers.

## Done when

- A shared book with one end is still one row, and a push moves every open child.
- Elias ending in March and Margaret in May, with a February break, are two rows. Pushing Elias does not move Margaret.
- "Use this for the rest" after a push puts each remaining row on its own pushed day.

## Tests

- Engine: matching ends stay one shared row; different ends are one row per open child, with that child's push-back day; a finished child is absent. Web: the sheet names the child on a forked row, and "Use this for the rest" uses each row's pushed day.

## Out of scope

- Undo of that save (S22-08).
- Adding several breaks in one save. Sprint 21 still refuses that.
