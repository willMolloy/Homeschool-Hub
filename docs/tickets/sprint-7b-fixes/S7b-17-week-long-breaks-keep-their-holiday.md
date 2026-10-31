# S7b-17 — Week-long breaks stay around their holiday

**Finding:** S7b tester N3 (Medium): a saved Thanksgiving week (Nov 23–27) applies as Nov 8–12, and Christmas break (Dec 21 – Jan 1) as Dec 6–17. Only breaks saved as exactly the holiday's dates work.  
**Depends on:** S7b-13  
**Size:** S

## Goal
A break that contains a US holiday is saved relative to that holiday and lands around the same holiday in the new year.

## Steps
1. When saving, if a break contains a known US holiday, store that holiday and the offsets (days before and after) instead of only exact-match holidays.
2. When applying, place the break at the holiday's new date with the same offsets, starting on the same weekday where the old one did (e.g. the Monday of Thanksgiving week).
3. Breaks with no holiday inside keep today's behaviour.

## Done when
- The tester's two cases land on Thanksgiving week and around Christmas in the next year.

## Tests
- Web/API: Thanksgiving week, a Christmas-to-New-Year break, a break with no holiday, an older template without offsets.

## Out of scope
- Non-US holidays.
