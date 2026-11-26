# S22-04 — Ask whether one child finished

**Source:** DeeDee, Sprint 22. **Depends on:** S22-03. **Size:** M

## Goal

"Did Elias finish?" marks only Elias finished, or stopped, or moves only his end.

## Context

The Home question is one card per assignment, and the names are joined: "Did Frank and Margaret finish History spine?" Yes, finished sets the assignment's ending, so both children are finished. DeeDee wants the question, and the answer, per child.

## Steps

1. A child is waiting when that child is on the book, that child is not finished or stopped, and that child's end is before today. Another child on the same book is a separate question.
2. The words are "Did Elias finish Treasure Island?" One child, one question. Several questions still open from "N assignments ended", counting questions. **Default, not a blocker:** a shared book whose two children are both waiting is two questions, and the count includes both.
3. Yes, finished and We stopped set that child's ending only. Not yet moves that child's end only. The other children stay as they are.
4. Changing an answer later is the same. When every child shares one ending, Change still offers "For everyone" as the default. When the endings differ, Change on a child's line changes that child.
5. The needs-you dot counts these questions.

## Done when

- A shared book whose end has passed asks "Did Elias finish …?" and "Did Margaret finish …?" as two questions.
- Answering Yes for Elias leaves Margaret open, and her question stays.
- Not yet for Elias moves only Elias's end. Margaret is still asked if her end has passed.

## Tests

- Web: the waiting list is one question per child, using each child's end; a fixture with no per-child rows still asks once per child from the shared end. API: finishing one child leaves the other open, and the plan closes only the child who finished.

## Out of scope

- Update status (S22-05).
- Term in review's book list (S22-09). That ticket reads the per-child finish this ticket stores.
