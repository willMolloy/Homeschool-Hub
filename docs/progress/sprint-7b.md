# Sprint 7b progress: fixes from the Charlotte Mason run and the Sprint 7 tester

Tickets: `docs/tickets/sprint-7b-fixes/`. S7b-08 (tester pass) is the tester's.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S7b-01 Undo a whole week adjustment at once | (this commit) | `PUT /api/week-overrides/batch` (`routes/weekOverrides.ts`); `WeekAdjustment` saves through it |

## Decisions (conservative calls on ambiguous points)

- **S7b-01 the endpoint.** `PUT /api/week-overrides/batch` takes `{ weekStart, set: [{ assignmentId, childId, plannedUnits, mode }], remove: [overrideId] }` (each list up to 100; at least one row in all). The checks are the single endpoint's (week aligned and not finished; assignment, child and total), run per row in one transaction, so a bad row saves nothing and records no undo. It records one undo entry whose steps put each row back (set, replaced or removed). Duplicate `set` rows (same assignment and child) or duplicate `remove` ids are refused (400); a `remove` id that is not this family's row for that week is a 404. It returns `{ overrides }` (the rows set).
- **S7b-01 the label.** Several rows: "Adjusted 3 assignments for Frank, week of Nov 2" (the undo bar adds the full stop); rows for more than one child (or a mix of one child and every child) read "for several children"; all for every child read "for every child". One row reads exactly as the single endpoint does ("Adjusted Treasure Island for Frank, week of Nov 2", or "Removed the adjustment to ..." for a lone removal). A save mixing removals and sets counts them all as "assignments adjusted".
- **S7b-01 the web client.** The sheet always sends the batch (even for one row), so one tap of Save is one request. `api/client.ts` lists the batch path among the plan-changing requests so the undo bar refreshes. The single-row PUT and DELETE endpoints are unchanged and still refresh it.
- **S7b-01 changed test expectations.** `week-adjustment.test.tsx`: the sheet's tests used to expect one `PUT /api/week-overrides` per changed row and a `DELETE` for a row taken back; they now expect one `PUT /api/week-overrides/batch` (body in `set` / `remove`), same values. The fake API's allowed body keys gain the batch. `undo-bar.test.tsx`: the batch path is added to the list of undoable requests. Nothing weakened.
