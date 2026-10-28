# T-03 — Layout function

**Source:** the Timeline Tools Page, "Architecture" (layer 3, "Layout") and its build-order item 3; DeeDee's hand-test rules (no overlap, horizontal room, more transparency); the product owner's calls of 2026-10-28 (2.8 px per point, opacity 0.82)  
**Depends on:** T-02 (the view model), T-01b (palette tokens)  
**Size:** M

## Goal
A pure `layoutTimeline(model, { zoom, width })` in `apps/web/src/features/timeline/layout.ts` that returns every position the SVG needs. That means rows and their centerlines, band paths, lane labels, breaks, event strips, month and week ticks, Today and the totals strip. It also adds a tap-target helper, so T-04 only draws and T-06 and T-07 only hit-test. No React and no drawing.

## Context
- Agreed:
  - Each row has a fixed centerline and thickens symmetrically about it.
  - Spacing comes from the thickest point plus a small gap.
  - Bars are semi-transparent, with slightly rounded corners.
  - There are three zooms, Year, Fall and Spring. Year draws weekly-smoothed bars; Fall and Spring draw daily ones.
  - Each child has its own sub-lane, and a drawn band is never thinner than 2 px.
- DeeDee, hand test:
  - Bars never overlap horizontally, even within one subject. Overlapping assignments go on separate rows.
  - The visualiser gets as much horizontal room as is reasonable.
  - Bars are a bit more transparent.
- Product owner:
  - The shared scale is the prototype's "Exaggerated" 2.8 px per point (was 2), kept as one constant.
  - Bar opacity is one token, starting at 0.82.
- Design principles: simple and calm, only what's essential, no extra helper text, badges or borders.

## Steps
1. `zoom.ts`: the Year, Fall and Spring ranges, split at New Year, and auto detail (weekly at Year, daily otherwise).
2. `xscale.ts`: equal-width columns for the family's school weekdays. Other days have no width.
3. `paths.ts`: band paths with rounded outer corners (2 px), and event rectangles as a single path.
4. `rows.ts`: no-overlap packing.
   - Each assignment's drawn extent covers both the daily and the weekly series, so rows never change between zooms.
   - Assignments are taken in order of first day, then id. Each goes in the first row whose last bar ends before it starts, otherwise in a new row.
   - Touching assignments share a row. Ones that draw nothing take no room.
5. `layout.ts`:
   - Rows:
     - Each row is as tall as its own thickest point, daily or weekly, with a 2 px floor.
     - Rows are one uniform gap (4 px) apart, with 8 px more before each subject.
     - Each row keeps a fixed centerline, and bars are centred on it.
   - Labels and width:
     - There is no label column. Each child's rows get one 16 px label line above them: the subject name, plus the child's name when the family has more than one child, and only the child's name for later children.
     - The plot spans the width less 4 px each side. T-04 draws it full-bleed on phones, with nothing beside it.
   - Breaks span the whole family, or all of one child's rows.
   - Events sit on strips under the axis, with the totals strip on its own scale.
6. `hit.ts`: every bar's tap target is at least 44 × 44 px, centred on the bar. Where targets meet, the closer centerline wins.
7. The shared scale (`features/plan/scale.ts`): `PX_PER_THICKNESS = 2.8`.
8. Opacity:
   - `scripts/palette.ts` emits one `--tl-bar-opacity: 0.82` on `:root`.
   - It checks colour-blind distances on bars as drawn (composited over the page and card backgrounds).
   - The report lists the as-drawn distances.
9. Before and after screenshots, at opacity 1 and 0.82 (Fall zoom, sample family, 360 and 1280 px), go in `docs/progress/screens/t-03-bar-opacity-*.png`.

## Done when
- [ ] No two bars on a row overlap, at any zoom or detail, at 360 and 1280 px.
- [ ] Row packing is stable: first day, then id, whatever the input order.
- [ ] Each row's height is its own thickest point, rows are one gap apart, and centerlines don't move between zooms.
- [ ] The plot is at least 97% of the width at 360 and 1280 px, and there is no label column.
- [ ] Every bar has a tap target of at least 44 × 44 px.
- [ ] `PX_PER_THICKNESS` is 2.8, and the layout uses it by default.
- [ ] `--tl-bar-opacity` is one token at 0.82, 15–20 points under the opaque prototype.
- [ ] As drawn at that opacity, the safe palette stays at least 0.065 apart (OKLab) under every simulation, on the page and on cards. That is within 0.01 of Okabe–Ito's own colours at the same opacity.
- [ ] **Only what's essential:** one label line per child, with no column, badge, border or helper text. A child's name shows only when there is more than one child.
- [ ] No minute keys in the output, and an empty model lays out without throwing.
- [ ] `bash scripts/check.sh` is green.

## Tests
- `apps/web/test/timeline-layout.test.ts`:
  - packing, reuse of a row, order stability, touching and empty assignments, and weekly extent
  - no overlap in the sample family at every zoom and detail, at 360 and 1280 px
  - row heights and gap, symmetric bars, fixed centerlines, the default scale, and per-child breaks
  - plot width at 360 and 1280 px, label placement and text, and that the labels carry only what's essential
  - tap boxes and the nearer bar winning
  - zoom ranges, no minutes, and an empty model
- `apps/web/test/palette.test.ts`: the opacity token, as-drawn colour-blind distances (page and card, both themes, every simulation), the Okabe–Ito comparison, and labels on a solid backing.

## Out of scope
- Drawing, the route and fetching (T-04). The Fall and Spring crossfade (T-05).
- In-bar names (T-06). Names go on a solid, opacity 1 patch of their own swatch, because on the translucent bar a few safe swatches miss 4.5:1 with either label colour.
- Editing (T-07 onward).
