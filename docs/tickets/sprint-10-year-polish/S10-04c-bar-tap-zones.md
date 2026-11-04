# S10-04c — 44 px tap zones on thin bars
**Source:** year-polish-notes "Must not get wrong"; split from S10-04 · **Depends on:** S10-04 · **Size:** XS

## Goal
Every bar can be tapped through a zone of at least 44 × 44 px, however thin it is drawn.

## Context
- S10-04 can draw bars as thin as `BAR_H_MIN` (8 px to start with). The UX review already noted 10 px bars under 44 px.

## Steps
1. Grow each bar's hit zone to at least 44 × 44 px. Where zones overlap, the nearer centreline wins.

## Done when
- The tap-target check reports no Year bar under 44 × 44 px at 320, 360 and 1280 px.
- Only what's essential.

## Tests
- Web: the hit-zone size; which bar wins an overlapping tap.

## Out of scope
- Badges (S10-15).
