# S20-02 — Leave the got-through number alone

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** S

## Goal

"They got to" opens on the last unit the week already shows, and switching to ahead or behind does not change that number.

## Context

Update status asks how the week went, then "They got to", with minus and plus. If the week was scheduled as chapters 16–18, the box has been opening on 19. Tapping Fell behind or Got ahead then steps the number down or up on its own. She called that sneaky. It happens for working ahead the same way.

The week's own words are the source of the default: the range that already says chapters 16–18 ends at 18.

## Steps

1. When the week shows chapters 16–18, the box opens on 18. The same rule for pages and lessons: the last unit named in that week's range, not one past it.
2. Tapping As planned, Got ahead, or Fell behind does not change the number. She changes it herself, with the stepper or by typing.
3. The number in the box is what Save uses. The app does not substitute a number it invented when she picked a chip.
4. **Default, not a blocker:** the chips highlight to match the number (the scheduled end means as planned, a higher number means ahead, a lower number means behind). Tapping a chip only moves the highlight if the number already says that. The end-date question follows the number, as it does when the number and the plan disagree today.
5. A week she already saved reopens on the number she saved, not on a fresh 19.

## Done when

- Chapters 16–18 open on 18.
- Tapping Fell behind leaves 18 in the box. Tapping Got ahead leaves 18 in the box.
- She can type 16 or 20 herself, and Save stores that number.

## Tests

- Web: a week whose range is chapters 16–18 opens the field at 18; each chip leaves the field unchanged; typing 16 and saving stores 16; typing 20 and saving stores 20. The same for a pages week. Undo still restores the week.

## Out of scope

- The past-date confirmation (S18b-01).
- Minutes assignments, which have no unit to get through (S20-01).
- Changing Keep, Move the end, or Pick a date, except that they follow the number she actually left in the box.
