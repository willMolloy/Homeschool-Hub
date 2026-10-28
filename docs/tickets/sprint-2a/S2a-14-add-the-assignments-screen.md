# S2a-14 — Add the assignments screen

**Depends on:** S2a-06, S2a-12  
**Size:** M

## Goal
`/schedule/assignments` lists assignments and has plain add and edit forms, including archive.

## Context
Phone-first: a list of cards (title, subject, children, units, dates); a form with subject select, title, unit type, total units, minutes per unit (blank = default, shown as the default value as a hint), start and end dates, and children checkboxes.

## Steps
1. List with 'Show archived'; empty and error states.
2. Add/edit form (same component) with client-side checks matching S2a-03 limits; server errors shown inline.
3. Archive/unarchive from the edit form.

## Done when
- [x] Adding an assignment through the form makes it appear in the list and on the plan debug view.

## Tests
- list renders subject and child names
- add submits the right body
- edit PATCHes only changed fields and replaces children
- minutes blank → null
- end before start → error, no request
- archive
- server 400 shown

## Out of scope
- Timeline, drag to reschedule, bulk edit.
