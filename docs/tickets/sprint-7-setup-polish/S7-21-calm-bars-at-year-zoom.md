# S7-21 — Calm bars at Year, Fall and Spring zoom

**Source:** Will, 2026-10-31: "at most we can show a very gradual and minimal shape change in something as zoomed out as a year. We can see all the choppy bitty gritty on the monthly or closer view." He liked the calm bars approach.  
**Depends on:** S7-18 (soft cap)  
**Size:** S

## Goal
When zoomed out (smooth detail: more than 8 weeks visible), each bar reads as an even band with gentle tapers; the day-by-day detail appears only at This month or closer.

## Context
- `features/timeline/layout.ts`: above `DETAIL_SPAN_WEEKS` (8) bars use the smooth path (`smoothColumns`) over weekly averages with a 3 px dead band; a short heavy stretch still makes a bar lumpy at Year zoom.

## Steps
1. For the smooth detail only, draw each assignment's series through a wider window: a centred moving average of about four weeks over its own school days (ignoring days outside its range), then limit the change between neighbouring weeks to a small slope (for example 2 px per week), and keep the 3 px dead band.
2. Keep each bar's overall size honest: a heavier assignment is still a thicker band, and the soft cap still applies.
3. The All subjects strip gets the same calm treatment at those zooms.
4. Daily detail (8 weeks or less) is unchanged.

## Done when
- At Year zoom, an assignment with a two-week heavy sprint draws as an even band whose thickness changes by no more than the slope limit per week; at This month the sprint's real steps show.

## Tests
- Layout: the slope limit between neighbouring weeks at smooth detail; a bar's average thickness within a small tolerance of its true weekly average; daily detail unchanged; units conserved in the underlying plan (unchanged engine).

## Out of scope
- Engine changes.
