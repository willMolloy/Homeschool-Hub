# T-05c — Calm zoomed-out detail, and This month

**Source:** DeeDee's feedback on the T-05/T-06 screenshots (2026-10-28, 2:45 and 2:50 PM CT): the timeline was too choppy and noisy zoomed out. **Depends on:** T-05b. **Size:** M.

This ticket **replaces the earlier "Year, Fall and Spring only" zoom decision** (T-05), at DeeDee's request.

## Goal

Zoomed out, the timeline reads as calm shapes: smooth curves, no event strips, quiet breaks and fewer labels. Zoomed in to a month, it shows the full daily detail. A parent can jump to the month that holds today and flip months with ‹ ›.

## Context

T-03 tied detail to the preset: weekly at Year, daily at Fall and Spring. At 390 px, daily steps over a 17-week half and weekly steps over a year both look jagged. Event strips, the hatching and a label for every month add noise.

## Steps

1. `zoom.ts`:
   - The presets are Year, Fall, Spring and **This month**. This month is the calendar month holding today, clamped to the grid (`defaultMonth`, `gridMonths`, `zoomRange(model, "month", month)`).
   - Detail follows the **visible span**, not the button. `DETAIL_SPAN_WEEKS = 8` is the one threshold: 8 weeks or less is daily, more is smooth. `DETAIL_HYSTERESIS_WEEKS = 1` keeps daily until the span passes 9 weeks (`detailForSpan(weeks, previous)`), so a span near the line doesn't flicker. This matters once manual zoom exists.
2. `smooth.ts`: `smoothSeries` is a centred moving average over 15 school days (3 weeks). It is computed per segment: runs of the series joined across gaps of fewer than 5 school days. So the average never spreads past an assignment's first or last day, and a week off or longer stays a gap.
3. `layout.ts`:
   - Smooth bars and the All subjects bar use the smoothed series.
   - `smoothColumns` rounds each thickness to even pixels, and holds it through changes under `SMOOTH_DEADBAND_PX` (3 px). Rounding happens before the curve, so there are no tiny jogs.
   - Event strips are laid out only with daily detail, so the lanes move up when they are hidden.
   - Week lines only appear with daily detail, and then they carry their day of the month.
   - On phones (< 640 px), month labels keep at least 48 px apart, which means every other month at Year.
4. `paths.ts`: `smoothBandPath`. Each stretch of one thickness contributes its centre, and monotone cubic curves (Fritsch–Carlson, so no overshoot) join them. Runs start and end square at full thickness. An end stretch narrower than 12 px takes its neighbour's thickness.
5. `Timeline.tsx` and CSS: with smooth detail, breaks are a plain tint at 0.12 opacity instead of the hatch.
6. Page:
   - `MonthNav` (‹ October 2026 ›) sits under the presets, only with This month. Its arrows are disabled at the grid's ends.
   - Choosing This month again returns to today's month.
   - On phones the four presets are one compact row under the title.
   - The image is named after the month ("October 2026 timeline").

## Done when

- [ ] Year, Fall, Spring and This month sit in one row. This month opens on today's month, and ‹ › flip it.
- [ ] At 8 weeks visible or less: daily stepped bars and event strips. Above that: smooth curves, no events, quiet breaks. The threshold is one constant, with hysteresis.
- [ ] The smoothing is a 3-week moving average that keeps every assignment's start and end, with no tiny jogs. The All subjects bar follows the same rule.
- [ ] Phones show fewer month labels.
- [ ] The crossfade between presets is kept.
- [ ] **Only what's essential:** four preset buttons, and the ‹ month › row only while This month is chosen. No legend, helper text, badges or borders.
- [ ] Before and after screenshots at 390 px.

## Tests

- New `apps/web/test/timeline-detail.test.tsx`:
  - the threshold and its hysteresis
  - detail follows the span (This month daily, the others smooth)
  - span in weeks
  - default month and clamping
  - the month range
  - events, hatch and dated week lines only in the month view
  - the moving average keeps start and end, bridges short gaps and keeps a week off
  - even rounding with a dead band, and an outline without overshoot
  - the All subjects bar follows the same rule
  - phones show fewer labels, at least 48 px apart
  - on the page: This month, ‹ ›, the month row only with This month, ‹ disabled at the first month
- Updated:
  - `timeline-zoom` (four presets; This month is offered even when the grid doesn't cross New Year)
  - `timeline-view` (four buttons, the quiet break, no events at Year, every other month label on a phone)
  - `timeline-layout` (centerlines measured from the lanes' top, across daily, weekly and smooth)

## Decisions

- **This replaces T-05's "Year, Fall and Spring only" decision, at DeeDee's request.** The 2:50 PM wording ("This month", today's month with ‹ ›) replaces the 2:45 PM "Month zoom".
- **Manual zoom (pinch, ctrl+wheel, pan) is its own ticket after T-07.** It is big on its own: gesture handling, a free range, and keeping Today and the selection anchored. The presets and month flipping ship first, and the span-based detail is already in place for it.
- **A month flip has no crossfade.** Only preset changes fade. Flipping is a step along the same view, and fading on each tap felt slow. The fade stays the T-05 one.
- **Centerlines move once at the threshold.** With events hidden, the lanes start higher (the space isn't reserved, because empty space is noise). Within one detail level nothing moves, and the crossfade covers the jump.
- **Weekly detail stays available** as an explicit layout option, used in tests. "auto" now picks daily or smooth.
- **Segments split at 5 zero school days** (a week off). Shorter gaps are bridged by the average, so one sick day doesn't break a curve. The hatch-less break tint still marks where the days off are.
- **Plateau centres, not every column, carry the curve.** At Year a column is under 2 px wide, so a curve through every column still looked stepped.
- **Before shots** were taken at the T-06 state (before the All subjects bar). The after shots include it.

## Out of scope

- manual pinch or ctrl+wheel zoom and pan (its own ticket after T-07)
- remembering the zoom or month across visits
