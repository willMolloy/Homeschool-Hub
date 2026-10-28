# S2b-16 — Tester pass: weight edge cases

**Depends on:** S2b-15  
**Size:** S

## Goal
The tester proves the weight feature holds at its edges, end to end (API + DB + engine + web), and files any failure as a bug ticket.

## Cases
1. **Zero, negative or huge weights:**
   - 0, -1, -0, 0.001, 100.01, 1e308, "1.4", NaN as JSON (`null` is valid), and a 3-decimal value are each rejected by the API (400) and the DB CHECK.
   - The web blocks them client-side.
   - 100 × 100 000 units gives a finite plan.
2. **Archived child:**
   - A suggestion for an archived child uses their history.
   - Creating an assignment for an archived child is still 400 (checkRefs).
   - Unarchiving keeps the history.
3. **A child with no history:**
   - The built-in default and hint for each unit type.
   - The first explicit save creates history, and the next add suggests it.
4. **Multi-child:**
   - Margaret (history 1.4) + Frank (none) → 1.4 and the mixed hint.
   - Both with history → the median of the two.
   - Saving 2.0 records a choice for both; the next suggestion for Frank alone → 2.0.
5. **Unit change on edit:**
   - pages(2) → chapters without a weight → 400.
   - With a weight → 200, and the choice is filed under chapters.
   - pages(2) → minutes with null → 200 and no choice row.
   - minutes → pages with no weight → built-in 1.
   - The web resets the field and shows the chapters suggestion.
6. **Median rule:**
   - 6 choices → the oldest is ignored.
   - An outlier 50 among 1.2s → the median stays 1.2.
   - An assignment edited repeatedly counts once.
   - Clearing to default removes that assignment's vote.
7. **Mixed lane:** 30 minutes a day of piano next to 10 pages a day at weight 1 → equal thickness (10 vs 10).
8. **Migration:** a DB at 003 with real-looking values (3, 4, 600, 0, NULL, minutes) upgrades to 006 with the expected weights (D3 table).
9. **Logged hours:** no plan field reports minutes, and no UI shows time derived from bars.

## Done when
- [ ] Each case has an automated test (the tester adds them under `apps/api/test/tester3.weights.test.ts`, `packages/engine/test/tester.weights.test.ts` and web as needed) or a written note in `docs/progress/tester-report.md` explaining why it is manual.

## Out of scope
- Performance.
