# S22-01 — Copy each child's end from the book

**Source:** DeeDee, Sprint 22. **Depends on:** —. **Size:** M

## Goal

Each child on an assignment stores their own planned end and their own finished or stopped state, starting as a copy of the book's.

## Context

`assignment.end_date`, `ended_as` and `ended_on` are the one end for every child. `assignment_child` only says who is on the book. Check-ins are already per child. This ticket adds the columns and fills them. It does not yet let a parent set one child differently. That is S22-03.

## Steps

1. Add `end_date`, `ended_as` and `ended_on` to `assignment_child`, with the same pair rule as the assignment (`ended_as` and `ended_on` are both set or both empty). `end_date` is required and is not before the book's start.
2. Migration copies every existing child's end and ending from the assignment. A new child row with no end of its own receives the book's end and ending.
3. Creating a book, replacing its children, and any save that still changes the book's end or ending writes the same values onto every child. A child who was already on the book keeps their row when the child list changes and the end is not part of that save. A child added in that save starts on the book's current end.
4. The assignment's own end and ending stay. While every child matches, they are that shared value. Nothing a parent sees changes in this ticket.

## Done when

- After the migration, every child on a book has the end and the ending the book had.
- Saving a new end on the book, the way the app does today, updates every child to that end.
- Adding a child to a book gives that child the book's end.

## Tests

- Database: the migration copies a finished book and an open book; a child end before the start is refused; finished or stopped still needs its day.
- API: creating a book and patching its end leave every `assignment_child` row with that end and that ending.

## Out of scope

- Planning from the child's row (S22-02).
- A save that changes one child and leaves the others (S22-03).
- The year bar, the break sheet, and the finish question.
