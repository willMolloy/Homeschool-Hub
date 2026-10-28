# S2a-16 — Add the events screen

**Depends on:** S2a-10, S2a-12  
**Size:** M

## Goal
`/schedule/events` lists recurring events with plain add, edit and archive, including per-subject rules and which children they apply to.

## Context
Fields: name, weekdays (checkboxes), optional start/end, how much of the day is left on 'lighter' (capacity, as a percentage 0–100), the default rule, a rule per active subject (Skip / Lighter / Normal / Use default), and children (whole family or specific).

## Steps
1. List with weekday summary and 'Show archived'.
2. Add/edit form; archive/unarchive.
3. Subject rules sent as a map only for subjects not on 'Use default'.

## Done when
- [ ] An event added here changes the plan debug view on its weekdays.

## Tests
- list
- add with rules
- edit replaces rules
- no weekdays → error
- archive

## Out of scope
- Time-of-day, one-off events.
