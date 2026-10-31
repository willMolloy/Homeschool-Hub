# S8-06 — Check in with one question, a check or Update status

**Source:** Was S6b-03. Will: "a check on them that says 'completed' or 'update status'. Update status can have a small box pop up… whether they got ahead or behind and how they want to handle that." Mockup "This week" and "Update status sheet".  
**Depends on:** S8-05  
**Size:** M

## Goal
**Track work** holds the check-in: last week's one question at the top (shown until answered), a check per bar and a small Update status sheet for anything different.

## Steps
1. While last week isn't checked in, a card at the top: "Last week (19–25 Oct) · Did everything get done?" with **Yes, all done** (saves the week as planned) and **Not quite** (shows last week's bars).
2. On last week's bars, the round check marks a bar done; tapping the bar opens **Update status** (bottom sheet): "How did it go?" As planned / Got ahead / Fell behind; "They got to {page/lesson} [−] N of total [+]"; "What about the end date?" Keep {date} ("The remaining days get a little heavier") or Move to {date} ("Keep the same pace"), with the dates computed; Cancel / Save.
3. Save sends the week once (check-in API: positions and modes; reaching the total sends mode null). "Add progress on something else" stays as a quiet link.
4. Remove the old card's chips, slider and stepper rows (T-09) and their tests, replaced by tests for the new flow.

## Done when
- One tap on "Yes, all done" checks in the week; "Fell behind, got to p. 138, move to 11 Nov" saves pushEndDate and the end date moves.

## Tests
- Web: both answers; the sheet's three outcomes with each end-date choice; the computed Keep/Move dates; finishing; Add progress. API unchanged.

## Out of scope
- Checking in mid-week.
