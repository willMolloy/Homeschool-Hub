# T-07c — Child filter

**Source:** DeeDee's request (PO message, 2026-10-28), before T-07b and T-08. **Depends on:** T-05b, T-07. **Size:** S.

## Goal

A parent can look at one child's year on its own. One row of chips at the top of the timeline (All, then one chip per child) narrows the picture to that child.

## Context

- The model (`model.ts`) already has one sub-lane per subject and child, so one child's view is a filter of the model, not a new plan.
- The All subjects bar (T-05b) is the sum of every sub-lane, drawn 32 px tall at its heaviest point. In one child's view it should be that child's load alone, normalized to that view.
- `useShownWeek` already keeps the Plan screen's week in the URL with `useSearchParams`, so the timeline can use the same pattern.

## Steps

1. `childView.ts` (pure):
   - `forChild(model, childId)`: keep that child's sub-lanes and the subjects they sit in, the breaks and events for the whole family or that child, and recompute `totals` from what is left. Grid, today and palette slots stay the same, so colours don't move between views. `null` returns the model unchanged.
   - `filterChildren(children, model)`: the chips. Active children with something on the timeline, in display order.
   - `shownChild(param, children)`: the `?child=` value if it names a chip, otherwise `null` (All).
2. `useChildParam.ts`: reads and writes `?child=<id>` (replace, not push). All removes the parameter.
3. `ChildFilter.tsx`: a `role="group"` named "Child" with toggle buttons (All, then each child), styled like the zoom presets. It renders nothing with fewer than two chips.
4. Page: the chip row sits under the title and presets, above ‹ month ›. Everything below (layout, selection, the lanes list) uses the filtered model.

## Done when

- [ ] All is the default. Choosing a child shows only that child's rows, and the All subjects bar is that child's load, 32 px at that view's heaviest point.
- [ ] The choice is in `?child=` and survives a reload. An unknown value falls back to All.
- [ ] The chip row is not rendered when the family has one child.
- [ ] **Only what's essential:** the chip names and nothing else. No label, count, helper text, badge or border.

## Tests

- New `apps/web/test/timeline-child-filter.test.tsx`:
  - `forChild`: All is the identity. One child keeps only their sub-lanes, breaks and events. The totals equal the sum of what is left, and palette slots don't move.
  - The All subjects scale is 32 px over the child's own peak, which is below the family's.
  - `filterChildren` leaves out archived and empty children, and `shownChild` accepts only a chip's id.
  - Page: All, Frank and Margaret, with All pressed. Choosing Frank leaves only Frank's bars, changes the totals path and writes `?child=frank`. Back to All clears it. `?child=margaret` opens on Margaret, an unknown id opens on All, and a one-child family has no chip row.
- `timeline-view.test.tsx`: the visible buttons now include the chips.

## Out of scope

- Filtering by subject. Remembering the choice anywhere but the URL.
