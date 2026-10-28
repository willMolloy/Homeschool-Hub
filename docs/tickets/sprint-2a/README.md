# Sprint 2a: schedule data (pilot-independent)

Scope: everything the timeline will need **no matter how the pilots go**: family settings, assignments, days off (blocked ranges), recurring events with per-subject rules, plain list/add/edit screens for them, and proof that `/api/plan` reflects them.
Same format and rules as Sprint 1: one ticket per commit, all checks green (lint, typecheck, build, test, test:tz).

**Not in this sprint (waits for the pilots):** the timeline visualization, bar thickness, rebalancing UX.

**Left out on purpose: the week-overrides API.** The rule for an override's mode when weeks have mixed modes is an open decision for DeeDee: the engine uses the *last edit*, but `loadPlanInputs` orders by week (tester risk 1). Once it's decided, add `week_override` endpoints and order by `updated_at, id`.

It also fixes two tester findings at the API boundary: **T-API-3** (a bad time zone → 500; S2a-01/02) and **T-ENG-2** (Infinity from absurd numbers; S2a-03 keeps them out).

### Order and dependencies

| # | Ticket | Depends on | Size |
|---|---|---|---|
| S2a-01 | [Validate family time zones](S2a-01-validate-family-time-zones.md) | Sprint 1 | XS |
| S2a-02 | [Add the family settings endpoint](S2a-02-add-the-family-settings-endpoint.md) | S2a-01 | S |
| S2a-03 | [Add schedule validation limits](S2a-03-add-schedule-validation-limits.md) | Sprint 1 | XS |
| S2a-04 | [Add the list-assignments endpoint](S2a-04-add-the-list-assignments-endpoint.md) | S2a-03 | XS |
| S2a-05 | [Add the create-assignment endpoint](S2a-05-add-the-create-assignment-endpoint.md) | S2a-04 | S |
| S2a-06 | [Add the update-assignment endpoint](S2a-06-add-the-update-assignment-endpoint.md) | S2a-05 | S |
| S2a-07 | [Add the blocked-range endpoints](S2a-07-add-the-blocked-range-endpoints.md) | S2a-03 | S |
| S2a-08 | [Add the list-events endpoint](S2a-08-add-the-list-events-endpoint.md) | S2a-03 | XS |
| S2a-09 | [Add the create-event endpoint](S2a-09-add-the-create-event-endpoint.md) | S2a-08 | S |
| S2a-10 | [Add the update-event endpoint](S2a-10-add-the-update-event-endpoint.md) | S2a-09 | S |
| S2a-11 | [Prove the plan reflects schedule data](S2a-11-prove-the-plan-reflects-schedule-data.md) | S2a-05, S2a-07, S2a-09 | S |
| S2a-12 | [Add the Schedule section](S2a-12-add-the-schedule-section.md) | Sprint 1 | XS |
| S2a-13 | [Add the family settings form](S2a-13-add-the-family-settings-form.md) | S2a-02, S2a-12 | S |
| S2a-14 | [Add the assignments screen](S2a-14-add-the-assignments-screen.md) | S2a-06, S2a-12 | M |
| S2a-15 | [Add the days-off screen](S2a-15-add-the-days-off-screen.md) | S2a-07, S2a-12 | S |
| S2a-16 | [Add the events screen](S2a-16-add-the-events-screen.md) | S2a-10, S2a-12 | M |
| S2a-17 | [Serve and canonicalize time zones](S2a-17-serve-and-canonicalize-time-zones.md) (tester T2-2, T2-3) | S2a-02, S2a-13 | S |
| S2a-18 | [Add a one-command demo](S2a-18-add-a-one-command-demo.md) | Sprint 1 | XS |

### Tracks
- **Family settings:** S2a-01 → S2a-02 → S2a-13 → S2a-17
- **Assignments:** S2a-03 → S2a-04 → S2a-05 → S2a-06 → S2a-14
- **Days off:** S2a-03 → S2a-07 → S2a-15
- **Events:** S2a-03 → S2a-08 → S2a-09 → S2a-10 → S2a-16
- **Contract:** S2a-11 after the API tickets; S2a-12 before any screen.

Implementation order used: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, then 17 and 18 (added after tester round 2).
