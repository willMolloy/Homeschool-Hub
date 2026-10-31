# Sprint 6 progress — steering: adjust a week, undo and reset, effort in time

Tickets: `docs/tickets/sprint-6-steering/`. Pass 1 covers S6-01 to S6-04.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S6-01 Load week adjustments newest edit last | efdc463 | `loadPlanInputs` orders `week_override` by `updated_at, id` |
| S6-02 Add the week adjustment endpoints | (this commit) | `routes/weekOverrides.ts`: `PUT` / `GET ?weekStart=` / `DELETE /:id` on `/api/week-overrides` |

## Decisions (conservative calls on ambiguous points)

- **S6-01 ties.** Rows with the same `updated_at` (one transaction) fall back to `id`, which is arbitrary but stable.
- **S6-02 replacing an edit.** `updated_at` is set with `clock_timestamp()` rather than `now()`, so two edits in one transaction still order. Saving the same assignment, child and week again replaces its amount and mode and moves it to the end of the edit order.
- **S6-02 who gets a 400 or a 404.** Everything wrong with the body or its references (misaligned or finished week, amount out of range, unknown or foreign or archived assignment, a child that is archived or not on the assignment) is a 400 `invalid_request`. A missing or foreign adjustment id on DELETE is a 404. Foreign ids are told apart from unknown ones by nothing, so nothing leaks.
- **S6-02 the current week.** `weekStart` may be the family's current week (it is "not before" it); adjusting the current week is the whole point of S6-03. Whole weeks only, two decimals, 0 up to the assignment's total.
- **S6-02 reading past weeks.** `GET` accepts any aligned week (past ones too, so the app can show what was set); only `PUT` refuses a finished week.
- **S6-02 demo family.** Not blocked: like check-ins, an adjustment only reshapes the plan and the demo is for looking around at exactly that.
