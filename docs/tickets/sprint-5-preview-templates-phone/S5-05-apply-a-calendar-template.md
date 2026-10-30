# S5-05 — Apply a calendar template from Days off

**Source:** ROADMAP.md, "Calendar templates for the year's shape"  
**Depends on:** S5-03, S5-04  
**Size:** M

## Goal
From Days off, a parent picks a year shape (built in, or their own "weeks on, weeks off"), sets the year's start and end, picks holidays, sees the breaks, and adds them all in one step.

## Context
- Days off is `features/schedule/DaysOffPage.tsx` on `ScheduleList`. Families don't store school-year dates, so the template asks for them.

## Steps
1. Add **Use a template** next to "Add day off". It opens a panel with:
   - shape: 36 weeks, Sabbath schedule (6 on, 1 off), Three terms (12 on, 2 off), or Custom (weeks on and weeks off, each 1–20);
   - first and last day of the school year;
   - US holidays as checkboxes, all ticked by default.
2. Show a preview list of the breaks it will add ("Thanksgiving: Nov 26–27", "Break: Oct 5–9"), with the count. Breaks that overlap an existing day off are left out and noted ("2 already in your days off").
3. **Add breaks** sends one bulk request (`kind: "holiday"` for holidays, `"vacation"` for pattern breaks; everyone). The list refreshes.

## Done when
- Each built-in shape and a custom 4 on / 1 off produce the expected breaks in the preview and create them.
- Overlaps aren't created twice; everything stays editable as normal days off.
- Works at 360 px; only what's essential.

## Tests
- Web (fake API): each shape's preview count; unticking a holiday removes it; an overlap is left out and noted; Add sends one bulk POST with the right kinds; invalid dates block Add.

## Out of scope
- Saving templates (S5-07); per-child templates.
