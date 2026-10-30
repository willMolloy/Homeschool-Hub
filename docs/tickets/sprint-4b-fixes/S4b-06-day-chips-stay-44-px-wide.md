# S4b-06 — Day chips stay 44 px wide for 6- and 7-day weeks

**Finding:** L2  
**Depends on:** none  
**Size:** XS

## Goal
Every day chip is at least 44 by 44 px at 360 px wide, whatever the number of school days.

## Steps
1. Give the chips a 44 px minimum width and let the row wrap onto a second line when they don't fit (subject form, assignment form, Add several, the missed-day sheet).

## Done when
- At 360 px, 5-, 6- and 7-day weeks give chips at least 44 px wide, with no horizontal overflow. (Measured in the next tester pass.)

## Tests
- Existing web tests pass; the size is checked in a browser.

## Out of scope
- Shorter day labels.
