# S2a-15 — Add the days-off screen

**Depends on:** S2a-07, S2a-12  
**Size:** S

## Goal
`/schedule/days-off` lists vacations and other blocked ranges with plain add, edit and delete.

## Context
Fields: label, kind, start, end, 'Whole family' or specific children. Delete asks for confirmation (the existing ConfirmDialog).

## Steps
1. List sorted by start; empty/error states.
2. Add/edit form; delete with confirm.

## Done when
- [x] A vacation added here shows as zeros on those days in the plan debug view.

## Tests
- list
- add (whole family → childIds [])
- edit
- delete with confirm and cancel
- end before start → error

## Out of scope
- Calendar picker UI beyond the native date input.
