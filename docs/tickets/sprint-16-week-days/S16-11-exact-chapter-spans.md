# S16-11 — Exact "start / day N of M / finish" from the real schedule

**Source:** Sprint 16 re-test N10 (Medium), N11 (Low).  
**Size:** S
## Steps
1. **N10:** compute the chapter (or lesson) span labels from the assignment's **actual sequence of scheduled days** across the whole plan (its cumulative positions day by day), not from one day's size. For each whole unit, find the scheduled days whose work falls in it after whole-unit rounding; label them start / day N of M / finish in that order. Every chapter that takes more than one day gets exactly one "start" and one "finish".
2. The daily and weekly sheets, the Days view and Update status ask the shared helper with the assignment's full plan (or enough days before and after the shown range) so a single day still knows its neighbours.
3. Apply span labels to **chapters and lessons only**. Pages keep plain whole-page ranges ("pp. 40–44", "p. 2").
4. **N11:** the print summary shows "—" (not "0") for school days when a child has nothing logged, matching the screen.
## Done when
- A daily book at about 0.26 chapters a day reads start, day 2 of 4, day 3 of 4, finish for each chapter; a Mon/Wed book at 0.5 reads start/finish; Days, sheets and Update status agree; no page book shows "day N of M"; the print summary shows "—".
## Tests
- Web: the helper on uneven paces (0.26, 0.4, 0.7, 1.3 a day), days off inside a span, adjusted weeks, last chapter; page books unaffected; Days = sheets.
