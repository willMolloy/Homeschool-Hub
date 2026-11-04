# S13-02 — The weekly sheet
**Size:** M
## Goal
One printed page per child for the chosen week.
## Steps
1. Header: the child's name and the week ("Week of Nov 2, 2026"); Soft Paper type, black-and-white friendly (subject colour only as a thin rule).
2. One block per subject: the subject's name, each assignment's title, then one row per school day of that week with the day and that day's range ("Mon · pages 120–126") and a checkbox square. Days the assignment doesn't run, days off and breaks are left out (a break day reads "Thanksgiving break" once).
3. Ranges come from the plan (the same helper as Week bars and Update status, `plannedRange`), in the family's units. **No minutes, no effort words.**
4. A "Notes" area with a few ruled lines at the bottom.
5. One child per page (`break-after: page`); fits US Letter and A4 at default margins; a week with lots of work flows to a second page for that child rather than shrinking text below 10 pt.
## Done when
- Print preview of the demo family, All children, shows one tidy page per child with the right ranges.
## Tests
- Web: the rows match the plan for a mid-book assignment; days off excluded; page breaks; no minutes anywhere.
