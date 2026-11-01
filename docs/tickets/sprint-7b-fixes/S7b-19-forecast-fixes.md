# S7b-19 — The late line stays honest after a days change

**Finding:** S7b tester N5 (Medium) and N6 (Low).  
**Depends on:** S7b-04, S7b-05  
**Size:** S

## Goal
A days change alone never hides or moves a late forecast.

## Steps
1. N5: a late assignment that has a week adjustment keeps its "will finish late" line after its days change.
2. N6: with no check-in since a days change, the forecast stays exactly where it was (same date, same weeks late).

## Done when
- Both tester cases show the same late line before and after the days change.

## Tests
- Engine: forecast with an adjusted week plus a days change; a days change with no check-in since.

## Out of scope
- New forecast wording.
