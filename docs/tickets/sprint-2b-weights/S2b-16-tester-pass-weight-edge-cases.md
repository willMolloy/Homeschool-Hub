# S2b-16 — Tester pass: weight edge cases

**Depends on:** S2b-15  
**Size:** S

## Goal
The tester proves the assignment weights and learned weights hold at their edges, end to end, and files any failure as a bug ticket. Subject defaults have their own pass (S2b-37).

## Cases
1. **Zero, negative or huge weights:**
   - 0, -1, -0, 0.001, 100.01, 1e308, "1.4" and 3 decimals are rejected by the API (400), the DB CHECK and the web.
   - 100 × 100 000 units → a finite plan.
2. **Scale (D1):** 30 min a day of piano with no weight and 15 pages a day at weight 1 → equal thickness (15 vs 15).
3. **Archived child:**
   - A suggestion uses their history.
   - A create for them is still 400 (checkRefs).
   - Unarchiving keeps the history.
4. **No history:**
   - The built-in default and hint for each unit.
   - The first explicit pages save creates history, and the next add suggests it.
5. **Trimmed mean:**
   - Five values with one outlier → the outlier is ignored.
   - Exactly 4 → the middle 2 are averaged.
   - 3 → the plain mean.
   - 6 → the oldest is ignored.
   - Repeated edits count once; a clear removes that assignment's vote.
6. **Learned units only (D17):**
   - Lessons and minutes saves write no history.
   - The suggestion for lessons ignores any history.
   - Chapters learn.
7. **Multi-child:**
   - Margaret (history) + Frank (none) → Margaret's value and the mixed hint.
   - Both with history → the median of their values.
   - Saving 2.0 records a choice for both.
8. **Unit change on edit:**
   - pages(2) → chapters with no weight → 400; with a weight → 200, filed under chapters.
   - pages(2) → minutes with null → 200 and no history row.
   - The web resets the field to the new suggestion.
9. **Migration (D3, ÷2):** a DB at 003 with the values 3, 4, 600, 0, NULL and a minutes row upgrades to 007 with the expected weights.
10. **Logged hours:** no plan field reports minutes; nothing in the UI shows time derived from bars.

## Done when
- [ ] Each case is automated (`apps/api/test/tester3.weights.test.ts`, `packages/engine/test/tester.weights.test.ts`, web as needed) or noted as manual, with the reason, in `docs/progress/tester-report.md`.
