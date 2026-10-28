# S2b-12 — Show thickness in the plan debug view

**Depends on:** S2b-02, S2b-05  
**Size:** XS

## Goal
The temporary plan debug table shows thickness per subject per day instead of minutes, and marks cells that use a default weight.

## Steps
1. `apps/web/src/features/plan/debugTable.ts`:
   - Cells read `thickness` and are rounded to 1 decimal. Totals are still the sum of the rounded cells.
   - `estimated` becomes `weightSource === "default"`.
2. `PlanDebugView.tsx`: column and legend text "effort (units × weight)", and the "~" marker means "default weight". Update `REVIEW-GUIDE.md` line ~60 in S2b-17, not here.

## Tests
- `plan-debug.test.tsx`: cell values from thickness, the default marker, and a mixed minutes and pages lane.

## Out of scope
- The real timeline (waits for pilots).
