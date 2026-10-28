# S2c-05 — Check-in polish: refresh the past weeks, one option on empty rows

**Findings:** L3, L5  
**Depends on:** none  
**Size:** XS

## Goal
1. **L3:** after the home card is saved (went as planned, Skip, or Save), the "Review a past week" list updates its labels without a reload.
2. **L5:** a row with no planned work that week (`plannedFrom = plannedTo`, for example a stored row in edit mode) shows one option, "Nothing planned", instead of "Done" and "Didn't start" that set the same position.

## Context
- `PastWeekReview` loads `/api/check-ins/weeks` with its own `useApi`. The home card's save only refreshes the plan, and only when the plan changed.
- `chipsFor` (`features/checkin/progress.ts`) always returns Done / About half / Didn't start.

## Steps
1. `planRefresh.tsx` gains a second counter, `checkInsVersion`, with `checkInsSaved()`.
   - Every successful check-in PUT calls `checkInsSaved()`, whatever it changed.
   - `PastWeeks` reloads its list when the counter changes.
   - `invalidate` (the plan) is unchanged.
2. `chipsFor`: when `plannedTo − plannedFrom ≤ 0`, return one chip, "Nothing planned", at `plannedFrom`, plus "Finished it" when it applies.
   - "Done", "About half" and "Didn't start" are only for rows with planned work.

## Done when
- [ ] Saving the home card (any of the three) updates the past-week labels.
- [ ] An empty row shows only "Nothing planned" (and "Finished it" when it applies).

## Tests
- `apps/web/test`:
  - `chipsFor` for an empty range;
  - PastWeekReview refetches after `checkInsSaved`;
  - the plan page: confirming the card updates the list.

## Out of scope
- Sharing one cache between the card and the list.
