# S22-05 — Update status for one child

**Source:** DeeDee, Sprint 22. **Depends on:** S22-03. **Size:** S

## Goal

Update status changes the end for the child whose bar was opened, and can still change everyone.

## Context

Update status is already one child for the check-in. The end date it saves is the assignment's end, so Keep or Pick a date moves every child. This ticket makes the end follow the child, which is what "act per child" asks for.

## Steps

1. The end saved from Update status names the child the sheet was opened for. The other children's ends stay.
2. When the book has two or more children, the sheet shows "Just Elias" and "For everyone". **Default, not a blocker:** "Just Elias" is selected, because the sheet was opened on Elias. "For everyone" writes the book's end, as an unscoped save does.
3. A minutes book still keeps its minutes a day. There is still no "of N minutes" stepper.
4. The week's check-in is unchanged. It was already per child.

## Done when

- Updating Elias's week and picking a later end leaves Margaret's end on the old day.
- Choosing "For everyone" on that sheet moves both.

## Tests

- API: a status save with a child moves that child's end only; without a child it moves every child. Web: the shared sheet defaults to the child who was opened, and "For everyone" is a visible choice.

## Out of scope

- The Home finish question (S22-04).
- A break that overlaps the book (S22-07).
