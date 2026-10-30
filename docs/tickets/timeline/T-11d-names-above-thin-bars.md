# T-11d — Names above thin bars

**Source:** DeeDee: "If something is very thin maybe we can have additional spacing above or below and have the title written above or below it." T-11c left 30 thin pieces unnamed (and 6 shortened) in the demo views. **Depends on:** T-11c. **Size:** S.

## Goal

A piece too thin for a name inside it (under 13 px) gets its name in a small label lane above its row, so thin bars are named again without spilling label colours onto the page.

## Steps

1. `names.ts`: `OUTSIDE_LANE_PX` (14) and `placeOutsideName`, which places the name left-aligned with the piece's start and cuts it with "…" to the piece's width. `placePieceNames` takes the lane's middle and falls back to it; the zoom rules are unchanged (Year: the first piece, plus later pieces at least 2× their name's width; closer views: every piece).
2. `layout.ts`: a row gets the lane (`LaneRow.labelLane`) only when one of its names sits outside. The lane pushes that row and the ones below it down; row height, centerline and hit areas are unchanged.
3. `Timeline.tsx` / `timeline.css`: `.tl-outside-name` is 11 px page text (`--tl-foreground`). It dims with its bar, and page text at 0.65 still meets AA. Inside names no longer dim, so they stay at full strength over a dimmed bar.

## Done when

- [ ] Thin pieces are named above their row, within the piece's width, and never over the next piece.
- [ ] Only rows with an outside name grow.
- [ ] The T-11 checks hold: no overlaps, names inside their own piece, connectors within one assignment, hit areas and dragging unchanged.
- [ ] Dimmed outside names meet AA on the page and on cards in both themes.
- [ ] **Only what's essential:** no helper text, badges or borders.

## Tests

- `apps/web/test/timeline-names.test.tsx`: placement and cut of outside names; lane only on rows that need it; every view's no-overlap / own-piece check, with outside names in the lane; drawing in page text; dimming while another bar is selected.
- `apps/web/test/timeline-layout.test.ts`: centerlines stay put across zooms apart from label lanes; labels and breaks account for the lane.
- `apps/web/test/timeline-opacity.test.ts`: outside names use page text; page text at 0.65 meets AA; full-strength inside names on dimmed bars fail AA in 45 of 240 combinations, against 165 before (vivid: none).
