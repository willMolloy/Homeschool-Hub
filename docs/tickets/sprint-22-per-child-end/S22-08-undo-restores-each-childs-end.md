# S22-08 — Undo restores each child's end

**Source:** DeeDee, Sprint 22. **Depends on:** S22-03, S22-07. **Size:** S

## Goal

Undo puts every child's end and ending back, including after a break that moved only some of them.

## Context

Undo stores the assignment's end. After a per-child change, that one date is not enough. A break confirm is one undo for the break and the ends it moved (Sprint 21). That undo has to restore each child, not one shared date.

## Steps

1. The assignment snapshot stores each child's end and ending. Restoring it writes those rows back.
2. A snapshot from before this sprint has no per-child rows. Restoring it sets every child from the assignment's end and ending, which is what that save did.
3. Undoing a break restores the break and every child's end that the break changed. A child the sheet did not move is unchanged, and stays unchanged after undo.
4. One undo, one step back. The label is still the break's label when the save went through the sheet.

## Done when

- Undoing a push of Elias only puts Elias's end back and leaves Margaret's.
- Undoing a "for everyone" push puts both children back.
- An older undo entry, with no per-child rows, still restores the book.

## Tests

- API: undo after a scoped end, and undo after a break that pushed one child of a forked book and kept the other, restores each child's end. A snapshot without children still sets every child from the assignment.

## Out of scope

- A second undo or a redo.
- Undoing a finish from the Home question by a new control. The existing undo bar is enough, and it uses this snapshot.
