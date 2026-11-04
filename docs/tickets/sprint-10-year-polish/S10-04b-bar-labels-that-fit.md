# S10-04b — Bar labels that fit
**Source:** year-polish-notes "Labels"; split from S10-04 · **Depends on:** S10-04 · **Size:** S

## Goal
Every bar's name is placed so it never overflows its bar or overlaps another.

## Context
- With dynamic heights (S10-04), many bars are thinner than a line of text.

## Steps
1. Place each label by the first rule that works:
   - inside the bar if it fits;
   - otherwise outside to the right, in muted text, if that part of the row is free;
   - otherwise "…" while keeping at least 6 letters;
   - otherwise no label (the tap still works).

## Done when
- At 320, 360 and 1280 px, in light and dark, no label overflows its bar or overlaps another.
- Only what's essential.

## Tests
- Web: each of the four fallbacks.

## Out of scope
- Tap zones (S10-04c, S10-15).
