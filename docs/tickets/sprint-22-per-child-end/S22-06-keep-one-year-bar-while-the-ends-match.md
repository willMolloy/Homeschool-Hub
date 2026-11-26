# S22-06 — Keep one year bar while the ends match

**Source:** DeeDee, Sprint 22. **Depends on:** S22-02. **Size:** S

## Goal

A shared book stays one bar in Together while the children end together, and splits into each child's own bar when they do not.

## Context

Under All children, work shared by two or more children is drawn once, in Together. The bar's thickness is the larger of the children's days. That stays when the ends match.

A check-in can already move one child's pace without a new stored end. That still shares the bar. This ticket splits the bar only when the stored ends, or the endings, are not the same.

## Steps

1. One Together bar when every child on the book has the same planned end, and the same ending: all open, or all finished on the same drawn end, or all stopped on the same drawn end.
2. When a planned end differs, or one child is finished or stopped and another is not, or two endings fall on different days, the book is not in Together. Each child has their own bar in their own group, with that child's end and that child's finished or stopped mark.
3. **Default, not a blocker:** this is per-child bars, not a split end on one bar. The child's group already draws one child's work. A check-in that does not change the stored end does not split the bar.
4. Filtering to one child is unchanged: that child's bar, with that child's end.

## Done when

- History spine for Frank and Margaret, same end, still one Together bar.
- Margaret's end a month later: two bars, one in each child's group, and no Together bar for that book.
- Frank finished and Margaret still open: two bars. Frank's shows finished. Margaret's does not.

## Tests

- Web: the year layout keeps a shared book in Together when the planned ends and the endings match, and puts it in each child's group when they do not.

## Out of scope

- A new bar shape, a second colour, or a label that says "split".
- Days view. It already keeps one Together line only when that day's range is the same for each child. S22-09 checks it still does once the plans diverge.
