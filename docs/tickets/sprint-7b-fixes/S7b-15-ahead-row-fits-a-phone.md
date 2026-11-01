# S7b-15 — An "ahead" check-in row fits a phone

**Finding:** S7b tester N1 (High): "4 chapters (1 more than planned)" squeezes the title to one letter per line and widens the page to 420–465 px on a 390 px phone.  
**Depends on:** none  
**Size:** XS

## Goal
The ahead wording never squeezes the title or makes the page scroll sideways.

## Steps
1. Let the amount wrap under the title (or onto its own line) instead of sitting in a fixed column; the title keeps at least its natural width.

## Done when
- At 360 px and 390 px an ahead row shows the full title (or a clean "…" cut) and the page is no wider than the screen.

## Tests
- Web: the ahead row's amount sits on its own line in the narrow layout.
- Browser check at 360 px (tester).

## Out of scope
- The Sprint 8 restyle of the check-in.
