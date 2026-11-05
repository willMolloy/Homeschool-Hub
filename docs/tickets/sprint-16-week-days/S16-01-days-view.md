# S16-01 — The Days view
**Size:** M
## Steps
1. A Days layout for the shown week, from the same plan data and whole-unit day ranges (S15-06) as the printable sheets, so screen and paper agree.
2. **Phone (under 840 px):** one scroll; each school day is a header ("Mon, Nov 2") with a small load bar sized like the Week bars' total for that day, then one line per item: subject icon, assignment title (truncated with "…"), range ("Ch. 18–19", "Lesson 32", "pp. 40–44"). Minutes items show the title only.
3. **Wide (840 px and up):** the school days as equal columns inside the content area, each a short list; no horizontal scroll at 1280 px for a typical week.
4. Days off and breaks: one quiet line in place of the list ("Thanksgiving break"). A day with nothing planned: "Nothing planned".
5. Tapping a line opens the same read-only detail / Update status as a Week bar does today (and for viewers, read-only only).
6. Finished and stopped assignments follow Sprint 12/13 rules (no lines after they ended).
## Done when
- A two-child week shows every day's work in one view on phone (one scroll) and desktop (columns), with ranges matching the printed weekly sheet.
## Tests
- Web: the day lists equal the weekly sheet's rows; days off; nothing planned; wide vs phone layout; tap opens the detail.
