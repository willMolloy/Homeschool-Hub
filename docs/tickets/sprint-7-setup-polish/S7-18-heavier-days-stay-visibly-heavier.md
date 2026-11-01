# S7-18 — Heavier days stay visibly heavier under the bar cap

**Finding:** Sprint 6b F2 (S6b-06 draws 100 and 300 pages a day at the same 96 px)  
**Depends on:** none  
**Size:** XS

## Goal
Under the soft cap, much heavier days still look heavier: 300 pages a day is visibly thicker than 100, which is thicker than 60.

## Context
- `softCapPx` in `features/plan/scale.ts`: exact to 56 px, then 56 + 40·(1 − e^(−(raw − 56)/40)), max 96. It saturates by about 280 px raw, so 100 and 300 pages a day both draw 96.

## Steps
1. Replace the exponential with a slower compression above the knee (for example logarithmic: knee + k·ln(1 + (raw − knee)/s)), with a hard maximum around 112 px, so 60, 100 and 300 pages a day differ by at least 6 px each and a 1,000-page typo still stops at the maximum. Record the final constants.

## Done when
- At normal effort: 20 pages a day = 56 px (unchanged); 60 < 100 < 300 pages a day by at least 6 px each; nothing above the maximum.

## Tests
- Unit: the three comparisons, the knee unchanged, the maximum never exceeded, monotonic.

## Out of scope
- Changing `PX_PER_THICKNESS`.
