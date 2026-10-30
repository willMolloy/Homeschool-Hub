# S4b-05 — "Set as default" applies when the form is saved

**Finding:** L3  
**Depends on:** S4b-04  
**Size:** S

## Goal
"Set as default for {subject}" takes effect only when the assignment is saved, so Cancel leaves the subject unchanged. (Coordinator's call.)

## Context
- Today the button PATCHes the subject at once; after Cancel the new default stays and, through S4-01b, gives uncustomised started assignments a weekday history.

## Steps
1. The button marks the choice ("Will be the default for {subject}", with a way to undo it) instead of saving.
2. On Save: PATCH the subject's `defaultWeekdays` first, then save the assignment with `weekdays: null`. If the subject PATCH fails, show the error and save nothing.
3. Cancel discards both.

## Done when
- Set as default → Cancel: no requests. Set as default → Save: subject PATCH then assignment save.

## Tests
- Web: both flows; a failed subject PATCH stops the assignment save; Add several is unaffected.

## Out of scope
- A confirmation listing affected assignments.
