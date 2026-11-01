# S6-01 — Load week adjustments newest edit last

**Source:** decision C1 (the most recent edit wins)  
**Depends on:** none  
**Size:** XS

## Goal
The plan applies week adjustments in the order they were edited, so the most recent edit wins wherever the engine resolves a conflict.

## Context
- `loadPlanInputs` reads `week_override ... ORDER BY week_start`. The engine treats list order as edit order (`prepareOverrides` in `placement.ts`: "later entry wins; it is the newer edit"; the first segment takes the latest applied override's mode).

## Steps
1. Order the rows by `updated_at, id` instead of `week_start`.

## Done when
- Two adjustments on different weeks with different modes: the one edited last decides the mode, whatever its week.

## Tests
- API integration (`load-plan-inputs.test.ts`): rows come back in edit order; a plan test where an earlier week edited later decides the mode.

## Out of scope
- The endpoints (S6-02).
