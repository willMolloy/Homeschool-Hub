# S7b-01 — Undo a whole week adjustment at once

**Finding:** CM run #1 (High): undoing a multi-row week adjustment reverts only one row, silently, and the toast names only one assignment.  
**Depends on:** none  
**Size:** S

## Goal
Saving the week adjustment sheet is one change, and Undo reverts all of its rows together.

## Context
- The sheet (S6-03, `features/plan/WeekAdjustment.tsx`) sends one `PUT`/`DELETE /api/week-overrides` per row; each records its own undo entry (S6-06), so the last row's entry replaces the others.

## Steps
1. Add a batch endpoint (for example `PUT /api/week-overrides/batch` with the rows to set and the ids to remove), applied in one transaction with **one** undo entry whose inverse restores every row as it was.
2. The sheet saves through it. The undo label names the child and week, and the count when there are several: "Adjusted 3 assignments for Frank, week of Nov 2."
3. Keep the single-row endpoints working.

## Done when
- Change three rows → Save → Undo: all three rows are back as before (the plan matches the pre-save plan), and the label said "3 assignments".

## Tests
- API: the batch applies all-or-nothing; one undo entry; undo restores every row (set, replaced and removed rows). Web: the sheet sends one batch request; the label.

## Out of scope
- Multi-step undo.
