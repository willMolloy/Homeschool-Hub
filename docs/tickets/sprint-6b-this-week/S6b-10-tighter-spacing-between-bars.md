# S6b-10 — Tighter spacing between bars

**Source:** Will's review (2026-10-31): "reduce vertical spacing between bars. Not touching but close. Gives us a better sense for the thickness differences."  
**Depends on:** S6b-06 (row heights follow the soft cap)  
**Size:** XS

## Goal
Bars sit closer together vertically (close but never touching), so differences in thickness stand out.

## Context
- `features/timeline/layout.ts`: `LANE_GAP_PX` 4 (between a subject's child rows), `SUBJECT_GAP_PX` 8 (between subjects), `LABEL_ROW_PX` 16 (names above lanes), and each row's height is its thickest band. T-11 uses a 2.5 px horizontal gap between neighbouring bars.

## Steps
1. Reduce the vertical gaps so neighbouring bars are about 2–3 px apart at their thickest (start with `LANE_GAP_PX` 2 and `SUBJECT_GAP_PX` 4), keeping subject labels readable and outside names (T-11d/T-11e) clear of the bar above.
2. Check in a browser at 390 and 1280 px on the demo family and adjust the constants once; record the final values.

## Done when
- No two bars touch at any zoom; the space between bars is visibly tighter than before; labels don't collide.

## Tests
- Layout tests updated for the new constants (no overlap between rows: each row's top ≥ the previous row's bottom + 2 px). Screenshots before and after in the tester pass.

## Out of scope
- Changing bar thickness.
