# S10-03 — Today in a sticky two-line axis
**Source:** mockup frame 3 · **Depends on:** S10-02 · **Size:** S

## Goal
The axis sticks to the top, with months on line 1, the "Today" pill on line 2, and a dashed Today line running down through every lane.

## Context
- Today the pill can sit on top of a month label, and the axis scrolls away with the lanes.
- The sticky child header rows from S10-02 sit under the axis.

## Steps
1. Make the axis two lines and sticky: months on line 1 and the Today pill on line 2.
2. Run a dashed Today line through all the lanes, with a 3 px halo so it stays off label text.

## Done when
- When the Year view scrolls, the axis and the Today pill stay visible.
- The pill never covers a month label.
- The Today line keeps off label text.
- Only what's essential: no new axis features.

## Tests
- Web: the axis is sticky, the pill has its own line, and the line spans every lane.

## Out of scope
- Zoom controls and the title row (S10-08).
