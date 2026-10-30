# S5-03 — Add year-shape helpers: holidays and on/off patterns

**Source:** ROADMAP.md, "Calendar templates for the year's shape"  
**Depends on:** none  
**Size:** S

## Goal
Pure engine helpers compute US school holidays for a date range and the breaks of an "N weeks on, M weeks off" pattern.

## Context
- The engine works on local date strings and day numbers, never `Date` objects (`dates.ts`), and is tested under 7 time zones.

## Steps
1. `usHolidays(start, end)`: returns `{ start, end, label }[]` for those in range: Labor Day, Thanksgiving (Thursday and Friday), winter break (Dec 24 to Jan 1), Martin Luther King Jr. Day, Presidents' Day, Good Friday, Memorial Day. Each has a stable key so the UI can offer checkboxes.
2. `onOffBreaks(start, end, weeksOn, weeksOff, weekStart)`: from the first week start on or after `start`, alternate `weeksOn` school weeks and `weeksOff` break weeks until `end`; return the break weeks as `{ start, end }[]` (whole weeks, clipped to `end`).
3. Built-in shapes as data: 36 weeks (no pattern breaks, holidays only), Sabbath (6 on, 1 off), three terms of 12 weeks (12 on, 2 off).

## Done when
- Both helpers are pure, exported from `@hh/engine`, and documented with the ticket id.

## Tests
- Engine: holidays for 2026–27 match known dates (Labor Day 2026-09-07, Thanksgiving 2026-11-26/27, MLK 2027-01-18, Presidents' Day 2027-02-15, Good Friday 2027-03-26, Memorial Day 2027-05-31); a range that excludes some; 6 on / 1 off from 2026-08-17 to 2027-05-28 gives breaks every 7th week; `weekStart` sun vs mon; weeksOff 0 → no breaks; `test:tz`.

## Out of scope
- Other countries' holidays; liturgical calendars.
