# S4-06 — Set default weekdays on the subject form

**Source:** ROADMAP.md, "Assignment weekdays"  
**Depends on:** S4-03  
**Size:** S

## Goal
A parent can set a subject's usual days (for example Math: Mon–Thu) as tappable chips on the subject form.

## Context
- `WeekdayPicker` in `features/schedule/formBits.tsx` already draws weekday chips for events. Reuse it.
- Subject forms are in `features/roster/SubjectForm.tsx`; the default weight section (`DefaultWeightSection.tsx`) is the pattern for an optional default.

## Steps
1. Add a "Usual days" picker showing the family's school days as chips. With no default set, all are selected and nothing is stored.
2. Saving with every school day selected stores null (no default); any other selection stores that list.
3. The subjects list shows nothing new unless a default is set (then e.g. "Mon–Thu").

## Done when
- Setting Mon–Thu saves `defaultWeekdays: [1,2,3,4]`; selecting every school day again saves null.
- At least one day must stay selected.
- Chips are 44 px targets at 360 px wide; only what's essential.

## Tests
- Web: set, change and clear a default; the last chip can't be deselected; the list line appears only when set.

## Out of scope
- Applying the default to existing assignments (they follow automatically when uncustomised, S4-05).
