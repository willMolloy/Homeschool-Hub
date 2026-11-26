# S22-09 — Read each child's end everywhere else

**Source:** DeeDee, Sprint 22. **Depends on:** S22-02, S22-04. **Size:** M

## Goal

Other copies, print, records, and the assignment list use each child's end and ending, not one date that ignores a fork.

## Context

Several screens read the assignment's end or its finished state. After a fork, the book's stored end is the latest child's end (S22-03) and the book's ending is set only when every child shares it. Readers that care about one child have to use that child's row.

## Steps

1. The assignment list shows one date range when the children share an end. When they do not, it names each child's end.
2. Other copies treat the book as running from its start through its latest child's end. **Default, not a blocker:** a copy that overlaps only the child who runs longer still counts as the same time. The date on the label, when the children and the days match, shows each child's end when those ends differ.
3. Print and the Days view read the plan, which is already per child (S22-02). A week where the children's ranges differ stays one line per child. A week where they match can still be one Together line.
4. Books finished, on a child's card and in term in review, includes a book that child finished even when a sibling has not. **Default, not a blocker:** All children counts the shared book once, and only when every child on it has finished, on the latest of those days.
5. The briefing, Home's week line, and the week bars already follow the plan. They are not given a second end.

## Done when

- The list for a forked book names both ends.
- Elias's term card includes a book only he has finished. The all-children list does not, until Margaret has finished it too.
- A printed week for Elias stops at Elias's end when Margaret's end is later.

## Tests

- Web: the list names both ends; books finished follows the rule above for one child and for all children; other copies use the latest end; a printed sheet for one child omits days after that child's end.

## Out of scope

- A new records field or a second book title per child.
- School days per child. Sprint 18b still uses one set of days for the book.
