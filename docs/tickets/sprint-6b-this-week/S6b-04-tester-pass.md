# S6b-04 — Tester pass: This Week

**Source:** HOW_WE_WORK.md, "Tester"  
**Depends on:** S6b-01, S6b-05 to S6b-10 (the held S6b-02, S6b-03 and S6b-11 get their own pass)  
**Size:** S

## Goal
The tester verifies Sprint 6b and writes `docs/reviews/sprint-6b-verification.md`, with before-and-after screenshots of This Week at 360 and 1280 px.

Also apply the screen tests in `docs/DESIGN_DIRECTION.md` (five seconds, one job, no duplicates, parent's words, empty state, phone first) to every screen these tickets touch.

## Steps
1. Gate with labelled counts; screenshots in `docs/progress/screens/sprint-6b/`.
2. Check each "Done when"; edge cases: a child with nothing planned; an assignment that finishes mid-week; "Got ahead" past the planned end; reaching the total; switching to an older week; the edit bar at 320, 360 and 390 px (Start, End, Copy, More; nothing scrolls sideways); a 300-pages-a-day assignment (bar capped, still taller than 100 a day; the form's pace note shows); a brand-new family with no subjects or assignments (empty calendar, adding a common and a new subject from the form); bar spacing before and after at 390 and 1280 px; the tap-target script at 320 and 360 px.
3. Findings with severity and steps to reproduce.

## Done when
- The report covers every ticket; no source or test files changed.

## Out of scope
- Fixing findings.
