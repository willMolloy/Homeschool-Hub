# T-02 — Timeline view model

**Source:** the Timeline Tools Page, "Architecture" (layer 2, "View model") and its build-order item 2  
**Depends on:** T-01b (palette slots and child steps), the engine's `planAll` / `aggregate` (S2b-02, S2b-14)  
**Size:** M

## Goal
A pure `buildTimelineModel()` in `apps/web/src/features/timeline/model.ts` that turns the plan API's per-child plans plus the roster and calendar into the lanes the timeline draws: one lane per subject, one sub-lane per child, each assignment's bar thickness on a shared daily grid, both day by day and weekly-smoothed, plus breaks, event days, Today and the total-load strip. No React and no drawing.

## Context
- The Page's layers: engine → **view model** → layout (T-03) → render (T-04) → interaction. Each layer is pure and tested on its own; the layout and SVG never call the engine.
- The Page's view model: lanes are subject → child sub-lanes; a daily grid; weekly smoothing that repeats the week's average on its days.
- Agreed decisions this ticket feeds: Year zoom shows weekly-smoothed bars; Fall/Spring show daily detail; per-child sub-lanes; T-01b tokens with the safe palette.
- The engine already does the smoothing: `aggregate(days, "weekly", weekStart)` spreads each week's thickness evenly across the days that count (S2b-14). The model calls it per assignment, so stacking still works.
- Values are bar thickness (relative effort, units × weight; S2b-02). Plans never carry minutes (`no-minutes.contract.test.ts`), and neither does the model.
- Data: `GET /api/plan?from&to` returns one `ChildPlan` per assignment × child; `/api/assignments` has titles; `/api/children` and `/api/subjects` have names and sort order; `/api/blocked` and `/api/events` have breaks and recurring events; `/api/me` has `weekStart`, `schoolDays` and `today`.
- The prototype (`published.tsx`) is the visual reference: a lane per subject × kid, assignments stacked inside it, events as a strip on top, a totals strip.

## Steps
1. `features/timeline/grid.ts`: the daily grid (`buildDayGrid`: every calendar day from `from` to `to`, with a school-weekday flag), `gridIndex`, `clipSpan`, `sumSeries`, and `weekAlignedRange` (widen a range to whole weeks so no weekly average covers half a week; T-04 fetches plans for that range).
2. `features/timeline/marks.ts`: breaks clipped to the grid (family-wide or per child), and each active event's days on the grid.
3. `features/timeline/model.ts`: `buildTimelineModel(input)`:
   - subject lanes in roster order (active first, then `sortOrder`, then name), each with a palette slot 1–10 dealt in that order;
   - child sub-lanes in roster order, each with a colour step (base / light / dark) by the child's roster position;
   - per assignment: daily and weekly thickness on the grid, first and last day with any thickness, end, planned end, estimated flag, warnings; stacked earliest-first, then by title;
   - per sub-lane and for the whole family: the sum, daily and weekly;
   - Today's grid index (−1 when off the grid).
4. A test fixture that plans the engine's sample family and converts it to the API shapes.

## Done when
- [ ] Every planned day's thickness in the range lands on the grid, unchanged.
- [ ] Each week's weekly-smoothed total equals its daily total, and is flat across the days it is drawn on.
- [ ] Lanes, sub-lanes and stacks come out in a stable, documented order, with palette slots and steps that match the T-01b palette.
- [ ] Breaks and events are clipped to the grid; archived or off-grid events are dropped.
- [ ] The serialized model contains no "minute" key.
- [ ] `bash scripts/check.sh` is green.

## Tests
- `apps/web/test/timeline-model.test.ts`: week alignment for both week starts; grid flags, index and clipping; empty (backwards) range; lane and sub-lane order; palette slots and wrap-around after 10; archived and unknown subjects; slot count and step names equal the palette script's; stacking order and thickness conservation; weekly smoothing keeps weekly totals and is flat; a shared assignment in both children's sub-lanes; totals; Today on and off the grid; break clipping; event days; no minutes.

## Out of scope
- No chart, Gantt or timeline libraries (the Page allows d3-scale / d3-shape / d3-array for math only, and this ticket needs none).
- Pixel positions, lane heights, zoom (T-03 and T-05).
- Rendering, the route and fetching (T-04).
- Labels (T-06) and editing (T-07 onward).
