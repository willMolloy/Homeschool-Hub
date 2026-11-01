# S8-09 — First-run checklist and empty states

**Source:** `DESIGN_DIRECTION.md` point 6 (no dead ends for a new family)  
**Depends on:** S8-04, S8-08  
**Size:** S

## Goal
A brand-new family sees a short getting-started checklist on Home, and every empty screen says what to do next.

## Steps
1. Home shows, until done: Add your children → Add subjects → Add your books and lessons → Set your year's breaks, each a row that opens the right screen and ticks itself when done. It disappears when all are done (and can be dismissed).
2. Empty states on This week, Year, and each setup list: one friendly line and the one button that fixes it.

## Done when
- A new family can go from sign-in to a planned year by following Home's checklist without visiting anything else.

## Tests
- Web: the checklist's steps tick as data appears; dismiss; each empty state.

## Out of scope
- Sample data.
