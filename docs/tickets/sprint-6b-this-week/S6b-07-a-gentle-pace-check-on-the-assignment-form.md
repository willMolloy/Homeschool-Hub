# S6b-07 — A gentle pace check on the assignment form

**Source:** Will, 2026-10-31 (agreed alongside the soft cap): huge bars usually mean a typo in the total or dates.  
**Depends on:** none  
**Size:** XS

## Goal
When an assignment's daily pace looks unrealistic, the form says so in one quiet line, without blocking Save.

## Steps
1. Once total, dates and days are filled, compute units per school day (total ÷ the assignment's school days in its range; reuse the S6-09 pace helper if present).
2. If it is above a per-unit threshold (pages > 60, chapters > 5, lessons > 5, minutes > 240 a day; named constants), show under the total: "That's about {n} {units} a day. Is that right?" Never block Save.

## Done when
- 300 pages over 1 day shows the note; 300 pages over 60 school days doesn't; saving still works with the note showing.

## Tests
- Web: the note appears above each unit's threshold and not below; Save is unaffected; the note updates as dates change.

## Out of scope
- Blocking unrealistic paces.
