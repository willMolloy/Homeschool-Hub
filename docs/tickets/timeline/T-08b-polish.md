# T-08b — Polish after the drag hand-test

**Source:** DeeDee's hand-test of T-08 (2026-10-28): "I don't like how some things like treasure island are lumpy in their size. I think they should be clean in this zoomed out view. And maybe when we click on an activity it loses its transparency. And maybe a clearer indicator that we can drag either end of the bar. And we could simultaneously see the start or end date adjust in the date picker fields." **Depends on:** T-08. **Size:** S.

## Goal

The zoomed-out picture is calm, and it is clear what is selected and how to drag it.

## Steps

1. `smooth.ts`: `cleanSeries` gives one assignment a piecewise-constant shape: weekly phases, with short or alike phases merged. `layoutTimeline` uses it in smooth detail; All subjects averages the clean shapes.
2. `Timeline.tsx` / `timeline.css`: the selected bar is fully opaque and gets a rounded grip inside each end, in its label colour.
3. `drag.ts` / `useBarDrag.ts`: the selected bar is grabbed first, and a short bar's ends reach 44 px. The cursor is ew-resize on the ends and move on the body.
4. `EditBar.tsx`: Start and End are controlled inputs, so they follow a drag live.

## Done when

- [ ] Year, Fall and Spring draw each assignment at one thickness, or as clearly distinct phases with a gentle step; no edge wobble, no smoothing across the start, end or a break. This month is unchanged.
- [ ] The selected bar is fully opaque; the others stay dimmed.
- [ ] Only the selected bar has grips, one at each end; on touch each end is at least 44 px wide.
- [ ] During a drag, the date fields update live: both for a body drag, one for an end drag. Cancelling restores them.
- [ ] **Only what's essential:** no helper text, badges or borders.

## Tests

- `apps/web/test/timeline-polish.test.tsx`: clean shapes and phases, breaks, Year bands vs month detail, reach, opacity and grips, cursors, and live dates.
