# S2b-25 — Show the "How did last week go?" card

**Depends on:** S2b-24  
**Size:** S

## Goal
The home screen (This Week, `/`) shows an optional, quick "How did last week go?" card. One tap confirms **Last week went as planned**, **Adjust** opens a per-assignment list, and skipping counts as done.

## Behaviour
- **When it shows (it never nags):**
  - Only when `GET /api/check-ins` (last week) has `status: null` and at least one item.
  - Once confirmed, saved or skipped, it's gone for that week on every device.
  - No reminders, badges, modals or pop-ups for older weeks.
- **Collapsed (the default, one line):** "How did last week go? 6 assignments were planned." with three controls:
  - **Last week went as planned** (primary): one tap → a PUT `{status: "reviewed", items: []}` → "Thanks!" → the card goes away. The bars don't change, because the plan already assumes done.
  - **Adjust**: expands the list.
  - **Skip** (a quiet link, titled "Skipping counts as done"): a PUT `{status: "skipped", items: []}`.
- **Expanded:**
  - One row per child × assignment, grouped by child, with multi-child assignments shown per child.
  - Each row: "Story of the World — pp. 1–80 planned" plus a ✓ "Done as planned" state.
  - Each row has the adjust control from S2b-36.
  - Untouched rows count as done.
  - The footer has **Save** (enabled once any row changed; the logic is in S2b-26) and **Last week went as planned**, which also resets any edits.
- A loading or error state never blocks the plan underneath; on error, hide the card.

## Steps
1. `features/checkin/LastWeekCard.tsx` (presentational, props only), `useLastWeekCheckIn()` (data and mutations), and `checkin.css`.
2. Mount it at the top of `routes/PlanPage.tsx`.
3. Fake-API handlers for GET and PUT.

## Tests (`apps/web/test/last-week-card.test.tsx`)
- Collapsed by default with the count.
- **Went as planned** → exactly one PUT (`reviewed`, no items) and the card is gone, with no other step.
- **Skip** → `skipped`, and the card is gone.
- Hidden when the status is set, when there are no items, and on error.
- **Adjust** expands the rows, with the planned ranges and one row per child on multi-child assignments.
- Keyboard: every control is reachable and labelled.

## Out of scope
- The row control (S2b-36), the behind/ahead question and save (S2b-26), and past weeks (S2b-27).
