# S10-15 — Year badges get a 44 px tap zone
**Source:** DeeDee's decision 5 (2026-11-03); Sprint 8 review N8; Sprint 9 verification ("the 11 known Year badges, 24 px wide") · **Depends on:** S10-02 · **Size:** XS

## Goal
Every Year badge can be tapped through a zone of at least 44 × 44 px without stealing taps from its neighbours.

## Context
- Today in `features/timeline/layout.ts`:
  - `BADGE_PX = 20`;
  - `BADGE_HIT_PX = 32` tall;
  - the gutter is 24 px wide.
- The Sprint 8 and Sprint 9 tap-target checks have flagged the badges as undersized ever since (24 px wide).
- S10-02 makes the gutter 36/40 px and the badge 24/26 px. This ticket closes the finding.

## Steps
1. Set `BADGE_HIT_PX` to 44 and give each badge's hit area a width of at least 44 px. It may extend a few pixels over the grid, where the badge wins over a bar.
2. Where neighbouring zones overlap, the nearer badge centre wins.
3. Keep tapping a badge to show the subject's name.

## Done when
- The tap-target check reports no Year badge under 44 × 44 px at 320, 360, 390 and 1280 px, in light and dark.
- No tap lands on the wrong lane.
- Only what's essential.

## Tests
- Web: each badge's hit area is at least 44 × 44; which badge wins an overlapping tap; a tap just beside the badge, over the grid, still selects the badge.

## Out of scope
- How badges look and where they sit (S10-02).
