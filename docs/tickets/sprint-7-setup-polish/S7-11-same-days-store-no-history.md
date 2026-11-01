# S7-11 — Choosing the subject's own days stores no history

**Finding:** Sprint 4b N1  
**Depends on:** none  
**Size:** XS

## Goal
Switching an assignment between "follow the subject" and an explicit list equal to the subject's days stores no weekday history, since the effective days don't change.

## Steps
1. In `weekdaysChange`, compare *effective* days (null resolved through the subject default, then the school days) before writing `weekdays_from` and `previous_weekdays`.

## Done when
- null → explicit Mon–Fri on a Mon–Fri subject (and back) stores nothing.

## Tests
- API: both directions; a real change still stores history.

## Out of scope
- Other history rules.
