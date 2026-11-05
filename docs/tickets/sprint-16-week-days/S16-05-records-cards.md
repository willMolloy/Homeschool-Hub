# S16-05 — Records cards that mean something

**Source:** Will, 2026-11-05: "2 days any child did school" is confusing; the book count (distinct typed titles) conveys nothing useful; "I like the books finished porting over from schedule data … I also like keeping the log of books."  
**Size:** S

## Steps
1. **School days card:** one child selected → "School days · 42". All children → each child's own count on the card ("School days · Frank 42 · Margaret 40"); no "any child" wording anywhere (Records, CSV headers, print summary).
2. **Books finished card:** the number of reading assignments (unit pages or chapters) the parent marked **finished** (Sprint 12 `ended_as = finished`) with `ended_on` in the range, for the selected child(ren). Tapping it lists the titles and finish dates. Only parent answers count; nothing inferred.
3. **Books mentioned:** the titles typed in log entries move from a big number to a short list section below the totals ("Books mentioned in your log"), de-duplicated as today (case and spaces). No count card for them.
4. Term in review (S13-05) and the CSV export use the same definitions: "Books finished" from completions; the typed list stays "Books read" in the CSV only if that column is ticked.
5. Hidden when untracked or empty, as now (never a zero).
## Done when
- The demo family's Records shows per-child school days, a Books finished count matching its finished reading assignments, and the typed books as a list.
## Tests
- API/web: per-child days; books finished from completions in range; mentioned list; term-review and CSV use the same numbers.
