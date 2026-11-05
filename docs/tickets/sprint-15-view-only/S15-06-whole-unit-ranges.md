# S15-06 — Day ranges in whole chapters, lessons and pages

**Source:** Will, 2026-11-05: a printed sheet showed The Secret Garden as "chapters 17–18, 18–19, 19–20, 20", so the same chapter looks assigned twice. Not a plan bug: the plan spreads ~1.3 chapters a day, so a chapter split across two days is listed on both.  
**Size:** S

## Goal
Wherever a day's work is shown as a range, each chapter, lesson or page belongs to exactly one day, ranges never overlap, and the last day still ends on the book's last unit.

## Steps
1. One shared display helper (used by the weekly and daily sheets, Week bars, and any other per-day range) turns the plan's fractional daily positions into whole units: round the cumulative position at the end of each day to the nearest whole unit; the day shows `previous rounded end + 1` to `this day's rounded end` ("Chapter 17", or "Chapters 18–19").
2. A day whose rounded end doesn't move (very slow pace, under half a unit a day) shows "Keep going: Chapter 7" instead of an empty or repeated range.
3. The plan, the engine and stored data are unchanged; this is display only. Update status and check-ins keep their exact positions.
4. Applies to pages, chapters and lessons. Minutes items are unchanged (no range).
## Done when
- The Secret Garden at ~1.3 chapters a day prints as non-overlapping days (e.g. 17, 18–19, 20, 21) that end on the right chapter; a 0.4-chapter-a-day book shows "Keep going" days; page ranges no longer repeat a page across days.
## Tests
- Web: the helper (1.3/day, exactly 1/day, 0.4/day, 3.7/day, last day lands on the total, days off skipped); sheets and Week bars use it.
