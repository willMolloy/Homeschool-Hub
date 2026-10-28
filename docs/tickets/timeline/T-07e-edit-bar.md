# T-07e — Edit bar at the bottom (replaces the adjust sheet)

**Source:** DeeDee (2026-10-28): "I don't think we want a modal if we click on an activity. Just have a couple of modifier fields appear at the bottom of the screen. Maybe fixed at the bottom … move up or back by a week but also have a change start and end date with a date picker." **Depends on:** T-07, T-07d. **Size:** M.

## Goal

Tapping a bar shows a slim, non-modal edit bar fixed to the bottom of the viewport, so the dates can be changed without leaving the timeline.

## Steps

1. API: `PATCH /api/assignments/:id` already takes `startDate`. Add a guard: a date change can't leave the latest check-in's week outside the assignment (409 `check_in_outside`, with a message naming the week).
2. `select.ts`: `moveWeeks`, `changedDates` and `datesError` (start on or before the end).
3. `EditBar`: the title with subject · child, × (Close), Move back a week / Move forward a week, Start and End (`input type=date`, saving on change), End a week earlier / End a week later, and Reset only after a change. Errors show inline. Esc or × clears the selection.
4. `useAssignmentEdit` saves (only the changed fields) and keeps the first dates for Reset. `useKeepAbove` measures the bar, adds that much room under the page, and scrolls the selected bar above it when it would be covered.
5. On phones the bar sits above the tab bar. From 640px it sits at the bottom, with the end steps beside the moves and the dates under them. `AdjustSheet` is removed.

## Done when

- [ ] Nothing exists until a bar is selected. Selecting dims the others, as before.
- [ ] The page behind still scrolls and zooms (no dialog, no backdrop).
- [ ] The bar never covers the selected bar.
- [ ] A start after the end is refused before any request. A server error shows inline.
- [ ] Moving past the latest check-in is refused with the API's message.
- [ ] **Only what's essential:** no helper text, borders or badges; Reset only after a change.

## Tests

- `apps/api/test/assignment-dates-check-in.test.ts`: the guard on both sides, and that allowed moves still plan.
- `apps/web/test/timeline-edit-bar.test.tsx`: hidden until selected; title, subtitle and dates; moves, end steps, date fields, validation, server error, Reset, × and Esc; the keyboard path.
