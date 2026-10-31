# S7b-14 — Small fixes from the independent review

**Findings:** independent review F-04, F-11, F-12, F-13, F-14. F-01 is S7b-01; F-08 is Sprint 8 (S8-05); F-09 is S7b-02; F-10's order is Will's decision (as built) and its term-start clipping is acceptable.  
**Depends on:** S7b-02  
**Size:** S

## Goal
Clear the independent review's small findings.

## Steps
1. **F-04:** the undo bar never covers an open menu or sheet: it hides while a menu or sheet is open and comes back after (or sits above the edit bar's menu).
2. **F-11:** tapping a minutes preset always counts as the parent's choice and saves that exact amount, even if it matches the suggestion's preset; a learned suggestion above 240 min a day is not offered (fall back to the subject's usual).
3. **F-12:** choosing a common subject in the form doesn't create it until the assignment is saved (Cancel leaves nothing behind); "New subject…" follows the same rule (S7-16's save order stays).
4. **F-13:** where the timeline's drawn start or end differs from the stored dates, the edit sheet and the Assignments list show the stored dates and the list adds "plan ends {date}" when the plan runs past the end.
5. **F-14:** the API listens on `HOST` from config, default `127.0.0.1` in development (the hosting step sets it for production).

## Done when
- Each finding's reproduction no longer reproduces.

## Tests
- Web tests for 1–4; an API config test for 5.

## Out of scope
- Redesign (Sprint 8).
