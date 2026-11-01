# S9b-01 — School days are real days

**Findings:** N1 (a second entry for the same child and day counts the day twice), N2 (All children shows the most any one child logged, understated and unexplained), N8 (a range only holds entries by their first day).  
**Size:** M

## Goal
School days are counted as distinct calendar days, never as a sum of entry counts.

## Steps
1. Store each entry's first and last day (it already has them) and derive days from dates, not a stored count.
2. Per child: school days = the distinct school-calendar days (days off excluded) covered by that child's entries with "Count as a school day" on. Two entries on one day count once.
3. All children: school days = the distinct days **any** child did school, labelled "Days any child did school" (with each child's own count in the per-child view). The label says what it means.
4. Ranges: an entry overlapping the range counts only its days inside the range. Its typed hours count in proportion to its school days inside the range (one entry over 5 days with 10 h, 2 days inside → 4 h), and the entries list shows "part of an entry from Nov 2 to Nov 6". (Coordinator default; plain arithmetic on the parent's own numbers, nothing invented. Will can overrule.)

## Done when
- The tester's cases: Frank logged twice on Monday shows 5 days for the week; Frank Mon–Thu and Margaret Tue–Fri shows 5 days under All children with the label; a custom Wed–Thu range inside a Mon–Fri run shows 2 days and 2/5 of its hours.

## Tests
- API: duplicate day, union across children, partial overlap of runs, days off inside a run, switch off.
