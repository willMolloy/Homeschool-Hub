# S1-34 — Map database rows to engine inputs

**Depends on:** S1-07, S1-11  
**Size:** M

## Goal
One API function `loadPlanInputs(db, familyId)` turns the family's rows into the exact `PlanContext` and `Assignment[]` types that `@hh/engine` expects.

## Context
The engine (`packages/engine`, `ENGINE_VERSION` 0.1.0) is pure. It knows nothing about SQL. This mapper is the only place where DB shapes meet engine shapes, so it must be well tested. Key mappings:
- family.week_start/school_days → `FamilyCalendar` (weekdays 0=Sun, same in both).
- assignment + assignment_child → `Assignment { childIds, subjectId, unitType, totalUnits, start, end, minutesPerUnit }` (DATE strings straight through, which S1-07's type parser guarantees).
- event + event_child + event_subject_rule → `RecurringEvent { childIds (empty = whole family), weekdays, start, end, capacityFraction, subjectRules, defaultRule }`.
- blocked_range + blocked_range_child → `BlockedPeriod`.
- week_override → `WeekOverride`.
- log_child_progress → `ProgressEntry { assignmentId, childId, date, units }` (sum per day is fine, the engine sums anyway).
Archived children/subjects/assignments are excluded from planning inputs.

## Steps
1. Create `apps/api/src/plan/loadPlanInputs.ts`.
2. Run one query per table, all filtered by family_id (≈7 small queries). Don't join everything into one giant query.
3. Group child/rule rows in JS with `Map`s.
4. Return `{ calendar, assignments, ctx: { calendar, events, blocked, overrides, progress } }`.
5. Leave `asOf` out of the loader. The route decides it (S1-35).

## Done when
- [ ] Loading the seeded family gives inputs that make the engine produce the same numbers as `packages/engine/test/sample-family.test.ts`.

## Tests
- integration: seed → load → `planChild(ti, 'frank')` baseRate ≈ 22.5 and the week of Oct 26 sums to 90 pages (same as the engine test)
- event with no event_child rows → `childIds: []`
- subject with no rule row uses default_rule
- archived child excluded from assignment childIds
- another family's rows never appear

## Out of scope
- Caching.
- Any UI.
