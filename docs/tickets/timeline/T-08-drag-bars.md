# T-08 — Drag a bar to change its dates

**Source:** DeeDee (2026-10-28): "Not sure how the sliding to adjust the activity got removed. We should be able to drag it … or a manual drag on the bar." **Depends on:** T-07e, T-07f. **Size:** M.

## Goal

A bar can be dragged: the body moves the whole assignment, the left or right end changes its start or end. The dates preview in the edit bar while dragging and save on release.

## Steps

1. `drag.ts` (pure): `dragKind` (44 px handles centred on each end; on a bar too short for both plus a body, only outside its ends), `draggedSpan` (whole weeks at Year, Fall and Spring; school days at This month; an end never crosses the other), and `previewModel` (the dragged assignment's planned values spread over the school days of its new dates that aren't a break for that child, keeping its total; its lane sums and All subjects follow, other lanes are the same objects).
2. `useBarDrag`: pointer events on the timeline's stage. A mouse drags any bar after 4 px. Touch and pen drag only the selected bar (selected-first). Once something is selected the picture takes `touch-action: pan-y pinch-zoom`, so a sideways drag moves the bar while vertical scrolling and pinch-zoom still work. A cancelled pointer drops the drag. The click that ends a drag is swallowed.
3. The page draws from the preview model while dragging, shows the preview dates in the edit bar, and saves the changed fields on release through the T-07e save (so Reset undoes a drag). The preview stays until the save returns.
4. The mouse cursor shows `ew-resize` over an end and `grab` over a body.

## Done when

- [ ] Body, start and end drags change the right dates, snapped per zoom.
- [ ] Only the dragged lane and All subjects change while dragging.
- [ ] On a phone an unselected bar can't be dragged, and the page still scrolls.
- [ ] The edit bar's buttons are the keyboard alternative.
- [ ] **Only what's essential:** no drag hints, handles drawn or helper text.

## Tests

- `apps/web/test/timeline-drag.test.tsx`: handle zones, snapping (weeks, school days, no crossing), the preview (same total, only that lane and the totals change), and the page (a mouse start drag previews then saves only `startDate` in whole weeks; an unselected touch doesn't drag; a cancelled touch drops it).
