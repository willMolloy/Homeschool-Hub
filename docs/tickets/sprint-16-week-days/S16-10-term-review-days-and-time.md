# S16-10 — Term in review follows the family's log setup

**Source:** Will, 2026-11-05: finished assignments vary too much in length to mean much ("Maybe we just stick with days and time" … "Or maybe we can adapt those cards to the logging style?").  
**Size:** S
## Goal
The Term in review card shows exactly what the family's log setup (S9-03) tracks, in the same words, and nothing from the schedule.
## Steps
1. Remove the Finished list and the Books finished number from the card.
2. Build the card's parts from the log setup's switches, in this order, each only when switched on and with data in the range:
   - **School days** (big number);
   - **Total hours** (big number);
   - **Core / non-core hours** (two numbers, when core/non-core is on);
   - **Hours by subject** (the bar chart, when hours by subject is on);
   - **Home / away hours** (when on);
   - **Books read** (the typed titles, de-duplicated, when books is on; "and N more" for long lists).
   Notes are never on the card.
3. The roomy (sparse) layout uses the first big number present as its hero; with nothing logged in the range, the page shows one calm line ("Nothing logged for this term yet") instead of a card.
4. Records' own cards are unchanged (Books finished stays on Records).
## Done when
- For each log template style (Hours by subject, Core and non-core hours, Days attended, Days and hours, Detailed log), the card shows exactly its fields, in light, dark, saved PNG and print; the `term-review` smoke passes.
## Tests
- Web: one case per template style; sparse fallback; nothing from completions on the card; PNG still 1080×1350.
