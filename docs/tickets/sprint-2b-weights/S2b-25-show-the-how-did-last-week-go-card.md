# S2b-25 — Show the "How did last week go?" card

**Depends on:** S2b-24  
**Size:** S

## Goal
The home screen (This Week, `/`) shows a dismissible "How did last week go?" card. Each row shows last week's planned range, pre-filled as done, so the parent can confirm it in one tap or correct any row.

## Behaviour
- **When it shows** (never nag):
  - Show it only if `GET /api/check-ins` (last week) has `status: null` and at least one item.
  - Once reviewed or skipped, it's gone for that week, on every device.
  - No reminders, badges or modals; older weeks never pop up on their own.
- **Rows:** grouped by child, one row per assignment.
  - "Story of the World — pp. 1–80" (with the unit word for chapters, lessons or minutes), and a ✓ "Done as planned" state.
  - **Change** opens an inline number field "Got to page ___", pre-filled with `plannedTo` and limited to 0..total.
  - Untouched rows count as done.
- **Buttons:**
  - **All done**: sends a `reviewed` PUT with no items.
  - **Save** appears once a row was changed (wired in S2b-26).
  - **Skip for this week** (a quiet link): sends a `skipped` PUT. Skipped work also counts as done.
- Multi-child assignments show one row per child, so Margaret can be at 80 while Frank is at 65.
- A loading or error state never blocks the plan underneath; on error, hide the card.

## Steps
1. `features/checkin/LastWeekCard.tsx` (presentational, props only), `useLastWeekCheckIn()` (data and mutations), and `checkin.css`.
2. Mount it at the top of `routes/PlanPage.tsx`.
3. Fake-API handlers for GET and PUT.

## Tests (`apps/web/test/last-week-card.test.tsx`)
- It renders rows with the planned ranges.
- Hidden when the status is set, when there are no items, and on error.
- All done → the PUT body is `{status: "reviewed", items: []}` and the card disappears.
- Skip → `skipped`.
- Change shows the field, limited to 0..total, with a client error outside it.
- Multi-child rows; accessibility (labelled inputs, buttons reachable by keyboard).

## Out of scope
- The behind or ahead question (S2b-26) and editing past weeks (S2b-27).
