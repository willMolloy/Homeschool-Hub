# S2b-36 — Adjust one assignment's progress on the card

**Depends on:** S2b-25  
**Size:** S

## Goal
Each row on the check-in card has a quick control for setting where the child actually got to, so adjusting one bar takes a tap or two.

## Behaviour
- **The row shows a mini bar** of last week's planned range, for example pp. 1–80, and starts "Done as planned" (position = `plannedTo`).
- **Quick chips:**
  - **Done** (= `plannedTo`)
  - **About half** (= midpoint, rounded to a whole unit)
  - **Didn't start** (= `plannedFrom`)
  - **Finished it** (= `totalUnits`), shown only when the total is within reach (`totalUnits - plannedTo` ≤ 2 × the week's planned units)
- **Fine-tune:**
  - A slider over the bar, from `plannedFrom` to max(`plannedTo` × 1.5, `plannedTo` + 10), capped at the total.
  - A number field "Got to page ___", which takes any value from 0 to the total.
  - The two stay in sync; arrow keys step by 1 unit.
- **Label:** "Got to p. 65 of 80 planned (15 behind)" or "(20 ahead)" or "On plan". Use the unit word for chapters, lessons and minutes.
- **Reset** restores "Done as planned".
- The row emits `{assignmentId, childId, position}` to the card; it doesn't save on its own.

## Steps
1. `features/checkin/ProgressAdjuster.tsx` (props: the planned range, total and unit type; emits onChange). It is pure, with no data fetching (SRP).
2. A shared `formatUnits(unitType, n)` helper, if one doesn't exist yet.

## Tests (`apps/web/test/progress-adjuster.test.tsx`)
- Each chip sets its position.
- **Finished it** shows only when the total is near.
- The slider and field stay in sync; the field rejects values below 0 or above the total, with an inline error.
- The behind, ahead and on-plan labels, with the unit words.
- Reset; arrow keys; the accessible name.
