# T-11 — Gaps between bars, connectors across breaks, a label in every piece

**Source:** DeeDee's request (approved Oct 30). **Depends on:** T-10b. **Size:** M.

## Goal

Different assignments never look like one bar; one assignment split by a break still reads as one; every piece names itself inside its own bar.

## Steps

1. `pieces.ts` (new): `insetEnds` pulls each assignment's outer ends in by half of `ASSIGNMENT_GAP_PX` (2.5 px), so neighbours in a row are always at least 2.5 px apart at every zoom. Visual only; dates don't change. `piecesOf` splits an assignment's columns into pieces at breaks; `connectorsOf` returns the spans between one assignment's own consecutive pieces.
2. `paths.ts`: rounded end caps (`CORNER_RADIUS_PX` 4, smaller on thin or short bars).
3. `layout.ts`: bands carry `connectors`; names are placed per piece; the T-10 labels past the bar end are gone.
4. `names.ts`: `MIN_NAME_CHARS` is 1 ("show what we can and append … as needed"). `placePieceName` fits the name inside the piece; on a thin piece the name sits on a 13 px patch centred on the bar and kept inside the row. `placePieceNames`: with daily detail (This month) every piece is named; zoomed out only the first piece and any later piece at least 3× its name's width.
5. `Timeline.tsx` / `timeline.css`: connectors are a 2 px round-capped line at 0.35 opacity in the bar's colour along the row centre, drawn under the bars.

## Done when

- [ ] Neighbouring bars never touch at Year, Fall, Spring or This month, at 390 and 1280 px.
- [ ] Connectors only join pieces of one assignment and never cross another bar.
- [ ] Every name sits inside its own piece, truncated with "…"; nothing too short for one character and "…" is labelled.
- [ ] In Frank's Literature row (the T-10b case), no label overlaps another.
- [ ] **Only what's essential:** no new text, badges or borders.

## Tests

- `apps/web/test/timeline-pieces.test.tsx`: insets, pieces, connectors, gaps and connectors in the layout at six views, drawn connector lines, rounded caps.
- `apps/web/test/timeline-names.test.tsx`: one-character truncation, piece names (thin patch, cut to "T…", thin rows skipped, the sparse rule), names inside their piece and row and not overlapping at eight views, the piece after a break named at This month.
