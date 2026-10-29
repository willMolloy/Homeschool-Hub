# T-10b — A label past a bar stops at the next bar

**Source:** checking the T-10 preview at 390 px. In Frank's Literature row, Treasure Island's label ("Treasur…") was drawn over The Hobbit's name. **Depends on:** T-10. **Size:** S.

## Goal

A label past a short bar never runs into the next bar or that bar's name.

## Cause

The label's limit was the start of the first bar that starts at or after this bar's computed end. The Hobbit's start (54.26315789473684) came out a hair below Treasure Island's end (54.26315789473685), so The Hobbit was skipped and the label ran on to the next bar after it.

## Steps

1. `names.ts`: `outsideNameLimit(rowStarts, ownStart, right)` is the first start after this bar's own start, otherwise the plot's right edge. Bars in a row never overlap, so this needs no float comparison against the end.
2. `layout.ts`: uses it.

## Done when

- [ ] At 390 px in the demo, Treasure Island has no label past it (there is no room before The Hobbit), and no label overlaps another name.
- [ ] **Only what's essential:** nothing new on screen.

## Tests

- `apps/web/test/timeline-names.test.tsx`: `outsideNameLimit` with the demo's numbers and at the right edge; the layout check now also covers 390 px and 320 px and checks that labels do not overlap names.
