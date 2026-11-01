# S7b-13 — Saved templates keep holidays on their real dates

**Finding:** independent review F-06 (Medium; also Sprint 5 O2): reusing a saved year shifts named holidays by days (Labor Day on Aug 23, Christmas on Dec 6–17), and applying the built-in shape later adds the real Labor Day too.  
**Depends on:** none  
**Size:** S

## Goal
A saved template keeps US holidays on their real dates in the new year, and only shifts the family's own breaks.

## Steps
1. When saving, a day off whose dates match a `usHolidays` entry for that year (S5-03) is stored by its holiday key instead of an offset.
2. When applying, holiday keys are recomputed with `usHolidays` for the new year; other breaks shift by the offset (aligned to the same weekday when the original started on the week start, so week-long breaks stay Monday to Friday).
3. Applying never adds a holiday that already exists on its date (the overlap rule already covers this once dates are right).

## Done when
- The review's case: Labor Day 2027 lands on Sep 6, Thanksgiving on Nov 25–26, Christmas break on Dec 24 – Jan 1; a week-long break stays Monday to Friday.

## Tests
- Web/unit: holiday keys saved and recomputed; breaks shifted and aligned; no double Labor Day.

## Out of scope
- Liturgical or other countries' calendars.
