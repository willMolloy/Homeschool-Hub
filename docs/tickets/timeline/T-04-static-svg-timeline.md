# T-04 — Static SVG timeline at Year zoom, reachable in the app

**Source:** Timeline Tools Page (render, performance and accessibility sections). **Depends on:** T-03. **Size:** M.

## Goal

The family can open the year timeline. It is a static SVG drawn from `layoutTimeline` at Year zoom, and a new **Timeline** item in the main nav reaches it.

## Context

T-02 builds the model and T-03 builds the layout, but nothing draws them yet. This ticket only draws. Zoom presets (T-05), names in the bars (T-06) and the adjust sheet (T-07) come later.

## Steps

1. `features/timeline/range.ts` decides which days to show.
   - The school year is the Aug 1 – Jun 30 window that contains today, since the family has no school-year setting yet. July counts as the coming year.
   - The plan is fetched for that window in whole weeks (≈ 343 days, under the API's 400-day cap).
   - The view is then trimmed to the planned weeks plus today.
2. `features/timeline/useTimelineData.ts` fetches the plan, children, subjects, assignments, days off and events, then builds the model. Archived events are left out.
3. `features/timeline/Timeline.tsx` is pure rendering, drawn back to front:
   - hatched breaks, then month gridlines with labels
   - lane labels (12 px, above each lane), then one path per band in `--tl-subject-N[-light|-dark]` at `--tl-bar-opacity`
   - the total-load strip under a "Total" label, then event strips
   - Today: the only strong mark, an ink line with a pill
4. `layout.ts` gives the totals strip a label row (`totals.labelY`), the same as a lane.
5. `routes/TimelinePage.tsx` shows the title and the picture, measures its width with a ResizeObserver, and runs full-bleed on phones. The route is `/timeline`, and a nav item sits between Plan and Kids.
6. Accessibility: the SVG is one labelled image ("Year timeline"). A visually hidden list next to it names every lane and its assignments with their dates.

## Done when

- [ ] Timeline is in the main nav and opens `/timeline`. The plan is fetched once for the school year.
- [ ] Bands, labels, breaks, months, totals and Today are all drawn from the layout. Nothing is positioned in the component.
- [ ] Year view stays under 300 SVG nodes for the sample family, events included.
- [ ] Loading, error (with Retry for only what failed) and "Nothing planned yet." states are covered.
- [ ] The timeline adds less than 40 KB gzip.
- [ ] **Only what's essential:** the title and the picture. No buttons, legend, helper text, badges or borders. A test checks this.
- [ ] Screenshots at 390 and 1280 px.

## Tests

- `apps/web/test/timeline-view.test.tsx` covers:
  - range rules
  - the nav item and the fetch range
  - one path per band with token fills, and labels matching the layout
  - hatch, months and Today
  - the node budget
  - the screen-reader list
  - the essential-only check
  - empty and error states
- `apps/web/test/app-shell.test.tsx`: five nav links.

## Decisions

- **Year range: Aug 1 – Jun 30, trimmed to what's planned.** This is conservative because there is no school-year setting. Fetching the whole window and trimming afterwards also covers ends that check-ins pushed later. Work planned before Aug 1 or after Jun 30 is clipped. If it matters, a school-year setting can come later.
- **Lane labels are SVG text, not a sticky HTML overlay.** At Year zoom the timeline fits the width and doesn't scroll, so nothing needs to stick. Revisit this if a later zoom scrolls.
- **Event strips have no visible names** (the layout leaves 6 px for them). The name shows on hover and in the screen-reader list. The demo family has seeded events, so they show there.
- **Width on wide screens** stays the shell's 960 px column (912 px plot at 1280). This avoids widening every page's shell just for this one.
- **Not lazy-loaded.** It adds about 5.3 KB JS and 0.3 KB CSS gzip, well under the 40 KB budget.

## Out of scope

- zoom presets and crossfade (T-05)
- in-bar names (T-06)
- selection and the adjust sheet (T-07)
- drag (T-08, T-09)
- the Table view toggle
- dark theme switching
