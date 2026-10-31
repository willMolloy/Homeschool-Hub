# Sprint 6b progress — a simple This Week

Tickets: `docs/tickets/sprint-6b-this-week/`. Pass A covers S6b-01, S6b-05, S6b-06, S6b-10 and S6b-09 (the timeline and This Week clean-up). S6b-02, S6b-03 and S6b-11 are held for the UX direction; S6b-07, S6b-08, S6b-12 to S6b-14 are a later pass.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S6b-01 Take the effort table off This Week | (this commit) | `PlanDebugView` draws the table only with the debug flag; each child keeps their name, "Make an adjustment" and warnings |

## Decisions (conservative calls on ambiguous points)

- **S6b-01 what stays.** The table goes; the per-child "Make an adjustment" entry, the "nothing planned" lines and the per-child warnings list stay (the warnings are a separate S6b-14 concern, so they are not touched here). With no table to caption it, the child's name is no longer `aria-hidden`.
- **S6b-01 changed test expectations.** Tests that used `findByRole("table", { name: "Frank" })` as "the plan has loaded" now wait for the "Make an adjustment for Frank" button (`this-week`, `briefing`, `plan-debug`). `this-week`'s "one button per student" no longer expects a table beside the button (it expects none). The old T-03b "parents see only the tables" test is now "parents see no table and none of the debug extras". Table-content tests already used `?debug=1` and are unchanged.
