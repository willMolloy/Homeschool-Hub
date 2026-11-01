# S7b-11 — Copy to a new year skips what's already copied, and can be undone

**Finding:** independent review F-05 (High): running Copy to a new year twice offered 42 (originals plus copies) and created 21 duplicates in two later years; the copy wasn't undoable and there's no delete.  
**Depends on:** none  
**Size:** S

## Goal
Running a copy again never duplicates, the copy lists only originals from the year being copied, and the whole copy can be undone.

## Steps
1. The year copy lists only assignments that start within the chosen "this year" (first day up to the day before "next year's" first day).
2. An assignment is "already copied" when one with the same subject, title, children and dates shifted by the year offset exists; those are left out and the panel says "{N} already copied".
3. The bulk create records one undo entry ("Copied {N} assignments to 2027–28") whose inverse removes exactly the created assignments (hard delete is fine: they have no check-ins yet; refuse the undo if any has one). Copy to another child gets the same undo.

## Done when
- Run the review's steps twice: the second run offers 0 and says "21 already copied"; Undo after a copy removes exactly those copies.

## Tests
- Web: the year window; already-copied detection; the message. API: bulk undo removes exactly the created ids, and refuses after a check-in.

## Out of scope
- Bulk delete in general.
