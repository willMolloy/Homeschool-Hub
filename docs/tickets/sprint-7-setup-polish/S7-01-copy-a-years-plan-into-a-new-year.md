# S7-01 — Copy a year's plan into a new year

**Source:** ROADMAP.md, "Year rollover and sibling reuse"; Will: plan only  
**Depends on:** none  
**Size:** M

## Goal
From the Assignments screen, a parent copies chosen assignments into a new school year, with every date shifted to the new year's start.

## Context
- `POST /api/assignments/bulk` (S3a-03) creates up to 50 assignments all or nothing and accepts `weightPerUnit` and `weekdays`.
- The app doesn't store school-year dates, so the parent gives the old year's first day and the new year's first day.

## Steps
1. Add **Copy to a new year** next to "Add several" and "Import CSV" (the `panels` slot on `ScheduleList`).
2. The panel asks for this year's first day and next year's first day, then lists the active assignments starting on or after this year's first day, all ticked, grouped by child, with untick-all.
3. Each copy keeps subject, title, unit, total, `weightPerUnit` and `weekdays` (null stays null) and the same children; start and end shift by the difference between the two first days. Nothing else is copied (no check-ins, adjustments or progress).
4. A preview line per copy shows the new dates. Copy sends bulk requests in chunks of 50; if one chunk fails, the message names it and the earlier chunks stay (the panel says how many were created).

## Done when
- Copying a 2026–27 year to a 2027-08-16 start creates the same assignments shifted by the difference, untouched otherwise.
- Only what's essential; 360 px; 44 px.

## Tests
- Web (fake API): the default selection; the shifted dates; fields copied including null weight and weekdays; 60 assignments send two bulk requests; a failing second chunk reports the first chunk's count.

## Out of scope
- Copying days off (calendar templates cover the year's breaks); archiving last year's assignments.
