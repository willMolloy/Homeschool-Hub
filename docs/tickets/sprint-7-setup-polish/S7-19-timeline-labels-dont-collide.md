# S7-19 — Timeline labels don't collide

**Finding:** Sprint 6b F7 (pre-existing)  
**Depends on:** none  
**Size:** XS

## Goal
On short ranges the month and day labels on the axis never touch, and the Today line doesn't run through lane names.

## Steps
1. Drop a day label when it would sit closer than its own width to a month label.
2. Stop the Today line at the top of the first lane's bars (below its name row), or draw names above it with a page-coloured halo.

## Done when
- On a short range (This month on a new family) "30" and "Dec" don't touch, and lane names stay readable where the Today line crosses.

## Tests
- Layout: label spacing on a short range; the Today line's top below the first name row.

## Out of scope
- New axis designs (Sprint 8).
