# S1-36 — Show a plan debug table

**Depends on:** S1-35, S1-20  
**Size:** S

## Goal
The Plan page shows a plain table of minutes per day for each child and subject for the current week, straight from `/api/plan`, as a developer check rather than the final timeline.

## Context
The real timeline UI waits for pilot results. Until then this table proves the whole pipe works (DB → loader → engine → API → web) and lets DeeDee eyeball numbers against the prototype. Label it clearly as temporary.

## Steps
1. On `PlanPage`, fetch `/api/plan` for the current week (use the engine's `weekStartOf(today, me.weekStart)` and `addDays`).
2. Group plans by child, then subject (use the engine's `mergeLane` per child+subject).
3. Render one `<table>` per child: rows = subjects, columns = the week's dates, cells = minutes rounded to whole numbers; a row total and a column total (use `sumByDate`).
4. Mark cells whose plan has `minutesPerUnitEstimated: true` with an asterisk + footnote 'estimated: default minutes per unit'.
5. Show any plan `warnings` in a small list under the table.
6. Header text: 'Debug view (temporary)'. Prev/next week buttons.

## Done when
- [x] The seeded week of Oct 26 2026 shows Frank's Literature as 45 min on Mon/Wed/Thu/Fri and 0 on Tuesday (co-op skip).

## Tests
- render test with a fixture PlanResponse: totals add up; estimated asterisk shown; warnings listed

## Out of scope
- Any timeline, zoom, drag or override UI (pending pilot results).
