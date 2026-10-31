# Sprint 6 progress — steering: adjust a week, undo and reset, effort in time

Tickets: `docs/tickets/sprint-6-steering/`. Pass 1 covers S6-01 to S6-04.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S6-01 Load week adjustments newest edit last | efdc463 | `loadPlanInputs` orders `week_override` by `updated_at, id` |
| S6-02 Add the week adjustment endpoints | 2090014 | `routes/weekOverrides.ts`: `PUT` / `GET ?weekStart=` / `DELETE /:id` on `/api/week-overrides` |
| S6-03 Adjust this or a coming week on This Week | (this commit) | `features/plan/WeekAdjustment.tsx` and `weekAdjust.ts` (pure); `ChildAdjustment` takes `ahead`; `PlanPage` picks it for the current or a coming week |

## Decisions (conservative calls on ambiguous points)

- **S6-01 ties.** Rows with the same `updated_at` (one transaction) fall back to `id`, which is arbitrary but stable.
- **S6-02 replacing an edit.** `updated_at` is set with `clock_timestamp()` rather than `now()`, so two edits in one transaction still order. Saving the same assignment, child and week again replaces its amount and mode and moves it to the end of the edit order.
- **S6-02 who gets a 400 or a 404.** Everything wrong with the body or its references (misaligned or finished week, amount out of range, unknown or foreign or archived assignment, a child that is archived or not on the assignment) is a 400 `invalid_request`. A missing or foreign adjustment id on DELETE is a 404. A foreign id looks exactly like an unknown one, so nothing leaks.
- **S6-02 the current week.** `weekStart` may be the family's current week (it is "not before" it); adjusting the current week is the whole point of S6-03. Whole weeks only, two decimals, 0 up to the assignment's total.
- **S6-02 reading past weeks.** `GET` accepts any aligned week (past ones too, so the app can show what was set); only `PUT` refuses a finished week.
- **S6-02 demo family.** Not blocked: like check-ins, an adjustment only reshapes the plan and the demo is for looking around at exactly that.
- **S6-03 which sheet.** The shown week decides: the current or a coming week gets the new amounts sheet (`ahead`), a past week keeps the check-in sheet untouched. So on the default view the "Make an adjustment" button no longer reopens last week; last week is still checked in on its card and by switching to it.
- **S6-03 changed test expectations.** `this-week.test.tsx` opened the check-in sheet on `/` (the current week). That now opens the new sheet, so its `openSheet` helper and the "save refreshes last week's prompt" test open on `/?week=2026-10-19` (last week). Every assertion in them is unchanged. `BODY_KEYS` in the fake API gained `PUT /api/week-overrides`.
- **S6-03 starting amounts.** Taken from the plan for the shown week (the child's days in it, rounded to 2 places), so an adjustment already saved is already in the starting value. A row shows when the child has work that week or an adjustment of their own for it.
- **S6-03 "back to the plan".** The plan response has no "without adjustments" amount, so a row cannot know the plan's own amount once adjusted. A row with the child's own saved adjustment gets a "Back to plan" button instead, which sends the DELETE on Save (and can be undone before saving). A row with no adjustment that is stepped back to where it started sends nothing. An adjustment set for every child (`childId` null) is shown in the amount but cannot be removed from one child's sheet.
- **S6-03 the end-date question.** One choice for the whole sheet, shown only once an amount moved (not for removals), defaulting to "Keep the end date", other option "Move the end date" (later if less, sooner if more). The check-in no longer asks per row (T-09), so there is no AbsorbChoice to reuse; this is a two-button group in the check-in's own style.
- **S6-03 limits.** Steps are 5 for minutes and 1 otherwise (the check-in's); the most an amount can be is what is left of the assignment, never below the current amount. Save sends one PUT per changed row in order, then closes the sheet and refreshes the plan; a refused save shows the message and keeps the sheet. The engine, not the sheet, handles the case where the plan cannot keep the end date.
- **S6-03 not checked.** The 360 px layout and 44 px targets come from CSS (44 px buttons, rows wrap) but jsdom has no layout, so they were not measured.
