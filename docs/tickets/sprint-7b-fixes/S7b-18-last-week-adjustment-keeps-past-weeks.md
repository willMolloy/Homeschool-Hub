# S7b-18 — A last-week adjustment never changes past weeks either

**Finding:** S7b tester N4 (Medium): lightening an assignment's last week with "keep the end date" rewrites every earlier week, past ones included (4.34 → 4.45 a week from Sep 14). That breaks S7b-09's goal.  
**Depends on:** S7b-09  
**Size:** S

## Goal
Past weeks never change, whichever week is adjusted. (Coordinator's default; Will can overrule.)

## Steps
1. When the adjusted week is the last one, spread the leftover over the weeks from today up to the end, never before today.
2. If there are no such weeks besides the adjusted one, the end moves later just enough to hold the work, and the late line says so.
3. Update the BUG 3 test to the new rule and record it in the progress doc. Bump ENGINE_VERSION.

## Done when
- The tester's case keeps every week before today unchanged.

## Tests
- Engine: last-week adjustment with weeks left before it; with none left; under the 7 time zones.

## Out of scope
- pushEndDate behaviour.
