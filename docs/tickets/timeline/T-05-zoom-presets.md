# T-05 — Zoom presets Year / Fall / Spring with crossfade

**Source:** Timeline Tools Page (zoom section; the agreed zooms are Year, Fall and Spring only). **Depends on:** T-04. **Size:** M.

> **Superseded in part by [T-05c](T-05c-calm-detail-and-this-month.md), at DeeDee's request.** The presets are now Year, Fall, Spring and This month, and detail follows the visible span (daily at 8 weeks or less, smooth above), not the preset. This replaces the earlier "Year, Fall and Spring only" decision. The rest of this ticket (the crossfade, Today anchoring, the control) stands.

## Goal

A parent can switch the timeline between the whole year and each half. The change is a short crossfade (under 250 ms) and is instant with reduced motion. Today and selection stay anchored to their dates.

## Context

T-03 already lays out all three zooms: `zoomRange` splits at New Year, and detail is weekly at Year and daily at Fall and Spring. T-04 draws Year only. This ticket adds the control and the transition. Every zoom fits the width, so switching never scrolls.

## Steps

1. `zoom.ts`:
   - `availableZooms(model)` offers Fall and Spring only when the shown grid spans New Year. Otherwise either half would just be the whole grid again.
   - `ZOOM_LABEL` holds the button labels.
2. `ZoomPresets.tsx` is a `role="group"` named "Zoom" with three `aria-pressed` buttons beside the title. It renders nothing when only Year makes sense.
3. `useZoomFade.ts` holds the page's zoom state.
   - On a change, the previous zoom becomes `leaving` for one fade (`FADE_MS` = 200), then it is dropped. It is dropped on `animationend`, or by a timer as a fallback.
   - With `prefers-reduced-motion: reduce` there is no leaving zoom.
4. `TimelinePage.tsx` lays out the current zoom, plus the leaving zoom while it fades.
   - The leaving picture sits on top (absolute, `aria-hidden`, no pointer events) and fades out while the new one fades in.
   - The image is named after the zoom ("Fall timeline").
5. CSS:
   - The buttons are plain text with no border, at least 44 px tall. The chosen one is bold on a soft fill.
   - Opacity-only keyframes. With reduced motion, no animation.

## Done when

- [ ] Year, Fall and Spring sit beside the title. Year is chosen first, and the chosen one is pressed.
- [ ] Each zoom draws `layoutTimeline(model, { zoom })`. Fall and Spring are daily, Year is weekly.
- [ ] Changing zoom crossfades in under 250 ms. It is instant with reduced motion, and pressing the current zoom does nothing.
- [ ] Today stays at its own date in every zoom that shows it, and the zoom state lives on the page, so a T-07 selection survives a change.
- [ ] Only one picture is exposed to assistive tech, and the screen-reader lane list is the same at every zoom.
- [ ] **Only what's essential:** the title, three zoom buttons and the picture. No legend, helper text, badges or borders. There is no control at all when only Year makes sense.
- [ ] Screenshots at 390 and 1280 px.

## Tests

- `apps/web/test/timeline-zoom.test.tsx`:
  - available zooms
  - default and pressed state
  - Fall and Spring layouts
  - Today anchoring
  - the crossfade (leaving layer, `aria-hidden`, removed after the fade)
  - reduced motion
  - no-op press
  - the lane list at every zoom
- `apps/web/test/timeline-view.test.tsx`: the essential-only check now expects exactly the three zoom buttons.

## Decisions

- **"Anchored"**: zooms are fixed ranges that fit the width, so there's no scroll position to keep. Anchoring means Today is always drawn at its own date, which a test checks across Year → Fall → Year. There is no selection until T-07, so the zoom state lives on the page, where a selection can sit beside it and survive zoom changes. Today doesn't show in Spring while it's still fall. That is deliberate rather than clamping it to an edge.
- **Starts at Year every visit**, not the half that holds today and not remembered. This is the conservative choice. Remembering the zoom (or a `?zoom=` link) is easy to add if the hand-test wants it.
- **The crossfade is opacity only**, with no scaling or sliding, which keeps it calm. Measured mid-fade in the preview at about 60 ms: 0.62 opacity. One layer is left after the fade.
- **Halves outside the grid:** if the planned weeks don't cross New Year, there is no control. This follows "nothing non-essential", since both halves would just repeat Year.
- **Buttons are text, not chips.** Chips have borders, and the design asks for none.

## Out of scope

- names in the bars (T-06)
- selection and the adjust sheet (T-07)
- pinch or wheel zoom
- free date ranges
