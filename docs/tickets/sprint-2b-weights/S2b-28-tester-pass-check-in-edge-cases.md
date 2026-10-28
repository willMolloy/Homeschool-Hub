# S2b-28 — Tester pass: check-in edge cases

**Depends on:** S2b-27  
**Size:** S

## Goal
The tester proves the decoupled schedule and check-ins hold at their edges, end to end, and files failures as bug tickets.

## Cases
1. **No logging needed:**
   - A family that never logs sees 90 for the week of Oct 26, and the plan doesn't change from day to day.
   - Adding log rows doesn't move any bar.
2. **Multi-child:**
   - A shared assignment, with Margaret all done and Frank at 65.
   - Only Frank's plan changes (both modes), and Margaret's stays.
   - Archiving Frank later hides his rows but keeps the stored check-in.
3. **Finished early:**
   - Position = total in week 2 → no bars after it, `finishedEarly`, and no question asked.
   - Editing that week back to as-planned brings the remaining bars back.
4. **Ahead:** both thin (keep the end) and pull-in (push) give an earlier or equal end date, and the totals still sum to the total.
5. **Vacation weeks:**
   - A fully blocked last week → no card.
   - A partly blocked week → the planned range covers only the open days.
   - Behind + push across a future vacation → the end skips the vacation.
6. **Editing a past check-in:**
   - Week 1 at 65 (keep), week 2 at 140 (push); then edit week 1 to 80 → from week 3 on the plan is driven by week 2's anchor.
   - Clearing week 2 → driven by week 1 again.
7. **A week with no planned work:**
   - Before the start, or every assignment finished → `items: []` and the card hidden.
   - A PUT with a position for a pair with no planned work but progress made → the `unplanned-progress` warning and a correct plan.
8. **Skip:** a skipped week counts as done, the card doesn't come back on reload or another device, and it can still be edited later.
9. **Bad input:**
   - Position -1, > total, 3 decimals, NaN or a string → 400.
   - A missing mode when behind → 400.
   - Future week → 400; a non-week-start date → 400.
   - A foreign assignment or child → 400.
10. **Edits after check-ins:** changing an assignment's total below a stored position → the engine clamps with a warning, and the card shows the clamped value.

## Done when
- [ ] Each case has an automated test (`apps/api/test/tester3.checkins.test.ts`, `packages/engine/test/tester.checkins.test.ts`, web as needed) or a note in `docs/progress/tester-report.md` saying why it's manual.
