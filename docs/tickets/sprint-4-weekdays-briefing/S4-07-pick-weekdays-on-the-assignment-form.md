# S4-07 — Pick weekdays on the assignment form

**Source:** ROADMAP.md, "Assignment weekdays"; Will's design (tappable chips, "Set as default for this subject")  
**Depends on:** S4-04, S4-06  
**Size:** M

## Goal
The assignment form shows the days as chips, prefilled from the subject's default (or every school day); tapping a chip customises this assignment, and "Set as default for this subject" saves the choice to the subject.

## Context
- `AssignmentForm` in `AssignmentsPage.tsx` is used by the Assignments screen, the timeline sheet and copies (S3a-01, S3a-02).
- An assignment that never customised its days stores `weekdays: null` and follows the subject (S4-05).

## Steps
1. Add a "Days" row of chips under the dates, using `WeekdayPicker` with the family's school days.
2. Prefill: the assignment's own days if set; else the subject's default; else every school day. Changing the subject re-prefills while the parent hasn't tapped a chip.
3. Saving: if the chips equal what the assignment would inherit, send `weekdays: null`; otherwise send the list.
4. When the chips differ from the subject's default (or the subject has none and not every day is chosen), show a small "Set as default for {subject}" button. It patches the subject's `defaultWeekdays` and then the assignment saves `null` (it now inherits).
5. Add several (S3a-04) gets the same chips in its shared fields; copies keep the original's own days.

## Done when
- A new Picture study assignment for a subject with default Fri starts with only Fri selected and saves `null`.
- Tapping Mon and Wed on a Mon–Fri subject saves `[1,3]`; "Set as default" makes the subject Mon/Wed and the assignment `null`.
- At least one day stays selected; 44 px chips at 360 px; no extra helper text.

## Tests
- Web: prefill from the subject; prefill from school days; customise and save a list; matching the default saves null; "Set as default" sends the subject PATCH then the assignment save; changing the subject before tapping re-prefills; Add several sends the shared days on every row.

## Out of scope
- Weekdays per child on a shared assignment; a CSV column.
