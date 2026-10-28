# S2b-23 — Add the week check-in read endpoint

**Depends on:** S2b-22  
**Size:** S

## Goal
`GET /api/check-ins?weekStart=YYYY-MM-DD` returns, for one past week, each assignment × child with planned work that week: its planned range, any stored actual position, and the week's review status. With no `weekStart`, it returns **last week**.

## Contract
- **"Last week":** the week before the one containing the family's local today (`familyToday`), using `family.week_start`.
- `weekStart` must be a week start and must be **before the current week**. A future or current week → 400 `invalid_request`: "weekStart: you can only check in on a finished week." Not a week start → 400.
- **Response:**
  ```json
  { "weekStart": "2026-10-19", "weekEnd": "2026-10-25", "status": null,
    "items": [{ "assignmentId": "…", "childId": "…", "childName": "Margaret", "title": "Story of the World", "unitType": "pages",
                "plannedFrom": 0, "plannedTo": 80, "totalUnits": 184, "actual": null, "mode": null }] }
  ```
  - `status` is null, `reviewed` or `skipped`.
  - `actual` is the stored position, or null (= as planned).
  - The planned range comes from the engine via `plannedRangeForWeek`, **ignoring that week's own check-in** (it shows what was planned, not what happened), but counting earlier check-ins.
- **Items:**
  - Only assignment × child pairs where `hasPlannedWork` is true, or that have a stored check-in.
  - Archived assignments and archived children are excluded, unless they have a stored check-in that week (so a past edit can still be seen).
  - Order: child name, then subject name, then title.
- A week with no planned work (a vacation, or before any assignment) → `items: []`. The web hides the card.

## Steps
1. `routes/checkIns.ts`, with a `services/checkInService.ts` that builds the items from `loadPlanInputs` and the engine. The route stays thin (SRP); the service is unit-testable with a fake loader.
2. Strict query parsing.

## Tests (`apps/api/test/check-ins-read.test.ts`)
- The default is last week, and `weekStart` is respected.
- A future or current week → 400; not a week start → 400; junk → 400.
- The planned range is 0–80 for the sample family in the week of Oct 19 (90 the next week, from the S2b-18 regression).
- A stored check-in shows as `actual` with no change to `plannedTo`.
- Vacation week → empty; family isolation; 401.
- Multi-child assignment → one item per child.
