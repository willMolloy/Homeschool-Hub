# S22-03 — Change one child's end

**Source:** DeeDee, Sprint 22. **Depends on:** S22-01, S22-02. **Size:** M

## Goal

A parent can move one child's end and leave the other children on the book where they are, and can still set one end for everyone.

## Context

Today the assignment form has one End field. Saving it changes the book. That remains the default when the children share an end, so a parent who does not pick anyone still changes the whole book.

## Steps

1. A save may name the children whose ends change. Naming none, and sending the book's end, still updates every child. That is the conservative default.
2. Naming one child updates that child's end only. The others keep theirs. The book's stored end becomes the latest of the children's ends, so the book still covers the longest run. **Default, not a blocker:** a child added later starts on that latest end.
3. On the assignment form, a book with two or more children shows who the end is for. **Default, not a blocker:** "For everyone" is selected when their ends match. "Just Elias" (one choice per child) is visible and is not selected. When the ends already differ, the form opens on each child's date, and "For everyone" is still there.
4. "For everyone" does not clear a finish or a stop. It moves the planned end.
5. One save is one undo. The undo remembers each child's end (S22-08 completes the break path; this ticket records the assignment's children).

## Done when

- Moving Elias's end to June, with Margaret left as she is, leaves Margaret's end and her plan on the old day.
- "For everyone" on the same book puts both children on the new day.
- A form that never touches the choice still saves the end for every child.

## Tests

- API: a scoped end leaves the other child; an unscoped end updates every child; the latest end is the book's end; a minutes book keeps its minutes a day. Web: the shared form offers "For everyone" and "Just {name}", "For everyone" is the default when the ends match, and saving without a choice sends no per-child end.

## Out of scope

- Marking finished or stopped (S22-04).
- Update status (S22-05).
- The break sheet (S22-07).
