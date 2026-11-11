# S21-03 — Move the end date when a break overlaps

**Source:** DeeDee, 2026-11-11. **Depends on:** S21-01, S21-02. **Size:** M

## Goal

She can push an overlapping assignment's end back by the break, or to a day she picks.

## Context

The other two choices. "By the length of the break" means the time that assignment actually loses, not the whole of February when the book only overlaps part of it. The custom day is her date, not one the app invents.

The daily pace stays about what it was. The end moves so the remaining work still fits. That is the opposite of S21-02, which keeps the end and makes the other weeks heavier.

## Steps

1. "Push the end back by the length of the break" moves the end by the count of that assignment's own school days inside the break. **Default, not a blocker:** walk that many school days forward from the current end, skipping this break and any other days off. A book that overlaps only the first week of February moves by that week, not by all of February.
2. "Push the end to a day I pick" shows the shared date field. **Default, not a blocker:** it opens on the day choice 1 would use. She may pick a later day, or an earlier day that is still after the break and after the assignment's start. A day inside the break is refused: "Pick a day after {the break's last day}."
3. The break's days stay off. Work is not placed on them. The bar runs to the new end.
4. On a shared book, the end moves for everyone on it. The sheet already says so (S21-01).
5. Each assignment uses its own choice. One book can keep its end while another is pushed.

## Done when

- A book that loses 5 school days to the break, and whose choice is "push back", ends 5 school days later, with February empty of that book.
- A custom day she picks becomes the end date, and a day inside the break does not.

## Tests

- Engine: push-back length equals that assignment's overlapped school days, not the calendar length of a longer break; the new end is a school day and the daily pace stays in the same neighborhood as before. Web: the custom date saves, an in-break date is refused, and a second assignment on the sheet can keep its old end.

## Out of scope

- The keep-the-end choice (S21-02).
- Undo (S21-04).
- Silently moving an end when she adds a break that overlaps nothing.
