# S21-01 — Ask before a break moves open work

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** M

## Goal

Saving a break that covers open assignments asks what to do with each one, and does not change the plan until she answers.

## Context

Days off and breaks already remove those days from the plan and keep each assignment's end date. That is a silent version of "make the other weeks heavier." She wants the question first, for a break she adds and for one she lengthens so that it newly covers planned work. February off, overlapping a book that runs January through March, is the example.

This ticket is the question and the list. S21-02 and S21-03 make the three answers change the plan. Until those land, do not offer an answer that saves the wrong outcome. The sprint merges only when the answers are real.

## Steps

1. A pure check lists each open assignment that has at least one of its own school days inside the break. A partial overlap is on the list. Say the overlap in plain words ("covers 8 school days in February").
2. An assignment she has marked finished is not on the list and is not moved. **Default, not a blocker:** a stopped assignment is treated the same way.
3. A break for one child lists only that child's work. **Default, not a blocker:** a shared book appears once. If she later pushes its end date, the sheet says the end moves for everyone on that book, because the book has one schedule.
4. The sheet names the three choices for each assignment: keep the end date and let the other weeks carry the work; push the end back by the length of the break; push the end to a day she picks. Closing the sheet or cancelling leaves the break and the assignments as they were.
5. This ticket does not apply a choice. Keep becomes a real save in S21-02. The two push choices become real saves in S21-03. Until the choice's own ticket, that choice is visible and must not save, and must not pretend it did.
6. If nothing open overlaps, the break saves as it does today, with no sheet.
7. The same sheet is used from Days off (add and edit), from first-run "Add a break", and from Use a template. **Default, not a blocker:** a template that adds several overlapping breaks uses one sheet, with each assignment under the break that covers it.
8. **Default, not a blocker:** after she picks a choice on one row, "Use this for the rest" fills the rows she has not answered. She can still change any row.

## Done when

- Adding February off over two open books opens the sheet and lists both, including one that only overlaps the first week of February.
- Cancel leaves the calendar and the end dates unchanged.
- A finished book overlapping February is not listed.
- A break that overlaps nothing saves with no sheet.

## Tests

- Engine or web, pure list: partial overlap included; finished and stopped excluded; a child-only break skips the other child's book; no overlap is an empty list. Web: cancel sends no save; a zero-overlap add still saves the break.

## Out of scope

- Applying "keep the end date" beyond today's reflow (S21-02 owns the confirmed wording and the test that the end did not move).
- Applying either push (S21-03).
- Undo of the combined change (S21-04).
- A repeating-weekday tool (Sprint 19 only labels a one-weekday off).
