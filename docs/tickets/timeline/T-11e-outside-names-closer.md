# T-11e — Outside names closer to their bars

**Source:** DeeDee, after trying it out: "The names are too high above the bar they should only be like two pixels above the bar." **Depends on:** T-11d. **Size:** S.

## Goal

A thin bar's outside name sits just above that bar: its lowest letters end about 2 px above the bar's top. A row gets only the extra space its outside names need.

## Steps

1. `names.ts`: `placeOutsideName` puts the name's bottom edge (`textY`, drawn with `text-after-edge`) `OUTSIDE_GAP_PX` (1) above the piece's top. Its box is `OUTSIDE_NAME_PX` (13) tall. The fixed 14 px lane is gone.
2. `layout.ts`: `labelLane` is the extra space the row's highest outside name needs, rounded up. It is 0 when the name already fits above the thin bar inside the row's height, and 0 for rows with no outside name.
3. `Timeline.tsx`: outside names are drawn with `dominantBaseline="text-after-edge"`.

## Done when

- [ ] In the browser, the lowest letters end about 2 px above the bar at 390 and 1280 px, in Year and This month.
- [ ] Names never touch the bar or reach into the row above (the 4 px row gap stays clear).
- [ ] **Only what's essential:** nothing else changes.

## Tests

- `apps/web/test/timeline-names.test.tsx`: an outside name ends `OUTSIDE_GAP_PX` above its piece. In every view, outside names sit above their bar and below the row above. Rows get only the space they need, and none without an outside name.
