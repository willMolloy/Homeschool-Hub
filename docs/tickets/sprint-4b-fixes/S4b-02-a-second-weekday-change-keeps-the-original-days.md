# S4b-02 — A second weekday change in a week keeps the original days

**Finding:** M2  
**Depends on:** none  
**Size:** XS

## Goal
Changing an assignment's days twice in the same week keeps past days on the days they had before the first change.

## Context
- `apps/api/src/services/weekdaysChange.ts` sets `weekdays_from` and `previous_weekdays` on every change. A second change in the same week overwrites `previous_weekdays` with the first change's days, so past days are re-drawn on the wrong days.

## Steps
1. If the stored `weekdays_from` already equals the start of the current week, keep the stored `previous_weekdays` and only update the current days.
2. If the new days equal `previous_weekdays`, clear both fields (the change is undone).

## Done when
- Mon–Fri → Fri → Tue/Thu in one week keeps past days on Mon–Fri.
- Mon–Fri → Fri → Mon–Fri in one week clears the history.
- A change in a later week behaves as before.

## Tests
- API integration for the three cases, for an assignment and for a subject-default change.

## Out of scope
- A longer history.
