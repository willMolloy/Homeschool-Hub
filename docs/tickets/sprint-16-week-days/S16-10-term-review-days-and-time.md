# S16-10 — Term in review shows days and time only

**Source:** Will, 2026-11-05: "Some things might be 6 month long assignments and others could be 2 weeks. Seems like it doesn't really give the user important info. Maybe we just stick with days and time."  
**Size:** XS
## Steps
1. The Term in review card shows **school days** and **time by subject** (with the total) only. Remove the Finished list and the Books finished number from the card.
2. The roomy (sparse) layout uses school days, else total time, as its hero; a family that tracks neither gets one calm line ("Nothing logged for this term yet") instead of a card.
3. Records' own cards are unchanged (Books finished stays on Records unless Will says otherwise).
## Done when
- The card shows only days and time in light, dark, saved PNG and print; the `term-review` smoke passes.
## Tests
- Web: card parts; sparse fallbacks; PNG still 1080×1350.
