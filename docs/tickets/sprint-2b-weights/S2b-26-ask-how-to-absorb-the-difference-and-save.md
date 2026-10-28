# S2b-26 — Ask how to absorb the difference and save

**Depends on:** S2b-25  
**Size:** S

## Goal
When a changed row is behind or ahead of plan, the card asks how to absorb it, saves the check-in, and the bars update straight away.

## Behaviour
- Per changed row (or once for all rows going the same way, with "apply to all" ticked by default):
  - **Behind** (position < plannedTo − 0.5): "Margaret is 15 pages behind on Story of the World." The choices are **Thicken the remaining weeks** (`keepEndDate`) or **Push the end date** (`pushEndDate`). v1 shows no preview numbers such as "about 2 more pages a day" or "ends Dec 12 instead of Dec 5" (**open decision D12**).
  - **Ahead** (position > plannedTo + 0.5 and < total): "…is 20 pages ahead." The choices are **Thin the remaining bars** (`keepEndDate`) or **Pull the end date in** (`pushEndDate`).
  - **Finished** (position = total): "Finished early 🎉". No question.
- **Default selection:** `keepEndDate`, preselected (**decision D10**), so Save works in one tap.
- **Save** → PUT `reviewed` with only the changed rows, then invalidate and refetch the plan so the bars update at once (with a loading shimmer on the plan, not a page reload). Then the card collapses to "Thanks — plan updated" for about 3 s and disappears.
- API 400s show inline on their row.

## Steps
1. An `AbsorbChoice` component (radio group) inside `LastWeekCard`.
2. Extend `useLastWeekCheckIn` with `save(items)`, which invalidates the plan query.

## Tests
- Behind shows the thicken/push wording; ahead shows thin/pull; total shows finished.
- Within 0.5 → no question, and the row is treated as done.
- The default mode is sent; changing it sends the other.
- Save calls PUT and then the plan GET, in that order.
- A 400 shows on its row.
- Two rows behind with apply-to-all → one choice applied to both.
