# T-06 — Names inside the bars

**Source:** Timeline Tools Page ("In-bar labels"). **Depends on:** T-05. **Size:** M.

## Goal

A parent can read what each bar is without opening anything. The name sits inside the bar, cut with an ellipsis when it is long, and is left out when even a short prefix won't fit.

## Context

T-04 draws one path per bar, and the only names are in the lane labels and the screen-reader list. The palette (T-01b) already has an AA label colour for every swatch (`--tl-subject-N[-step]-label`). That colour is measured against the solid swatch, but bars are drawn at 0.82 opacity, so the name needs a solid patch of its own swatch behind it.

## Steps

1. `names.ts` (pure):
   - `fitName(title, room, measure)` returns the full title if it fits. Otherwise it returns the longest prefix plus "…" with at least 4 characters, with any trailing space trimmed before the "…". Otherwise it returns null.
   - `placeName(title, columns, cy, measure)` puts the name in the leftmost stretch of touching columns that are all at least 13 px thick, pinned 2 px in from that stretch's left edge.
     - The patch is the text plus 4 px each side.
     - Vertically, the patch fills the bar's thinnest thickness under it, so it never pokes out of the bar.
   - The default measure is a deliberate over-estimate (0.6 em per character), so a name can be cut early but never overflows its patch.
2. `layout.ts`:
   - Adds `names: BarName[]`, at most one per bar.
   - The measure is injected through `LayoutOptions.measureText`.
3. `useMeasureText.ts`: a cached canvas `measureText` in the page font at 11 px. It falls back to the estimate when `OffscreenCanvas` isn't available.
4. `Timeline.tsx` draws the names after the bars. Each name is a patch filled with the bar's swatch at opacity 1, plus text in that swatch's label colour. The group is `aria-hidden`, because the full names are already in the lane list.

## Done when

- [ ] Names show inside their bars, pinned left, at every zoom where they fit. Long names end in "…". There is no name when 4 characters plus "…" won't fit.
- [ ] Each name's patch lies inside its bar, and the text uses the swatch's AA label colour on the solid swatch.
- [ ] Names fade with the zoom crossfade, and are instant under reduced motion. They are part of each zoom's picture.
- [ ] Full names stay in the screen-reader list. Names add no extra accessible text.
- [ ] **Only what's essential:** one name per bar at most. No badges, borders, rounded chips, counts or extra text.
- [ ] Node count stays under 300 at 1280 px.
- [ ] Screenshots at 390 and 1280 px.

## Tests

- `apps/web/test/timeline-names.test.tsx`:
  - fit and truncation (full, cut, 4-character minimum, trailing space)
  - placement (left pin, thickness rule, thinning bar, non-touching columns)
  - layout names inside their own bars at Year/Fall/360
  - the injected measure
  - rendering (patch and label colours, `aria-hidden`, node budget)
- AA of every label colour on its solid swatch is already covered by `test/palette.test.ts`.

## Decisions

- **The threshold is the fit rule itself, at every zoom.** The Page says "above the zoom threshold". With only Year, Fall and Spring, the conservative reading is that a name shows wherever it fits and nowhere else. At Fall and Spring, the daily bars break at non-school days, so names only appear on long unbroken runs. Limiting names to Fall and Spring would be a one-line change.
- **Patch at full bar thickness, square corners.** A rounded 13 px chip looked like a badge in the preview. Filling the bar's height makes it read as a solid stretch of the bar. A solid patch is needed: 5 swatches (light theme) miss AA at 0.82 opacity.
- **Pinned to the bar's own left**, meaning the first thick-enough stretch. There is no horizontal scroll, so "left edge in view" is always the bar's left.

## Out of scope

- selection and the adjust sheet (T-07)
- names on event strips
- hover tooltips
