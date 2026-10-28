# S2b-24 — Add the save check-in endpoint

**Depends on:** S2b-23  
**Size:** S

## Goal
`PUT /api/check-ins/:weekStart` saves a week's review in one transaction: the changed positions, the absorb choices, and the review status (`reviewed` or `skipped`).

## Contract
- **Body (strict):**
  ```json
  { "status": "reviewed",
    "items": [{ "assignmentId": "…", "childId": "…", "position": 65, "mode": "keepEndDate" }] }
  ```
  - `status: "skipped"` requires `items: []`. A skipped week counts as done as planned and only hides the card (**decision D14**).
- **Each item:**
  - `assignmentId` and `childId` must belong to the family, and the child must be on the assignment (`checkRefs` style, 400 `invalid_reference`).
  - `position` is ≥ 0, ≤ `totalUnits` and has at most 2 decimals, otherwise 400.
  - `mode` is required (400 "mode: choose how to catch up or use the extra time") when the position differs from `plannedTo` by more than 0.5 units **and** the position < total (**D11**).
  - `mode` must be null when the position equals the plan or finishes the assignment.
- **Semantics: PUT replaces the week.**
  - Items equal to `plannedTo` (within 0.5) are **not** stored, and any old row for them is deleted. "Last week went as planned" is the empty-items case.
  - Pairs missing from `items` lose their stored row, so un-editing a past check-in restores "as planned".
  - The `week_review` row is upserted.
- **Week rules:** the same as GET (only finished weeks, which allows editing any past week). Editing an older week while later weeks have check-ins is allowed; later anchors win from their own week on (S2b-20).
- **Response 200:** the same shape as GET for that week, plus `planChanged: boolean`. The web then refetches `/api/plan` (or the response could include it; keep it separate, SRP).

## Steps
1. `checkInService.saveWeek(tx, …)`: validate against the engine's planned ranges, delete and upsert `progress_checkin` rows, then upsert `week_review`, all inside one `withTransaction` (a `Tx` type).
2. Route in `routes/checkIns.ts`.

## Tests (`apps/api/test/check-ins-save.test.ts`)
- Went as planned (no items) → 0 rows and `status: reviewed`.
- 65 of a planned 80 with `keepEndDate` → a row, and `/api/plan` shows thicker bars after it.
- The same with no mode → 400.
- 100 of a planned 80 with `pushEndDate` → the plan's end moves earlier.
- Position = total with mode null → `finishedEarly`; position = total with a mode → 400.
- Position > total → 400; -1 → 400; 3 decimals → 400.
- A child not on the assignment → 400 `invalid_reference`; a foreign id → 400.
- Skip with items → 400; skip → status `skipped` with no rows.
- **Edit a past week:** save 65, then save again with no items → the row is gone and the plan is back to the original.
- A future week → 400.
- A failure part-way through → nothing is written.
