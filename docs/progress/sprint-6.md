# Sprint 6 progress — steering: adjust a week, undo and reset, effort in time

Tickets: `docs/tickets/sprint-6-steering/`. Pass 1 covers S6-01 to S6-04.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S6-01 Load week adjustments newest edit last | (this commit) | `loadPlanInputs` orders `week_override` by `updated_at, id` |

## Decisions (conservative calls on ambiguous points)

- **S6-01 ties.** Rows with the same `updated_at` (one transaction) fall back to `id`, which is arbitrary but stable.
