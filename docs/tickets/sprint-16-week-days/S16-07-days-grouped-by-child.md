# S16-07 — Days view: work grouped by child

**Source:** Will, 2026-11-05: under All children "we don't know what assignment is for what child", and the coloured M/F initials are confusing.  
**Size:** S
## Steps
1. Under All children, inside each day (phone stack and desktop columns): a small heading per child in the child's colour ("Frank", "Margaret"), with that child's lines under it, in the family's child order; then a **Together** heading for work shared by two or more children (listed once, as the Year view's Together group).
2. Remove the initial/colour-dot markers from Days lines.
3. A child with nothing that day is left out of that day; a one-child day off reads under that child's heading ("Dentist").
4. One child selected: no headings (as now).
5. Headings are real headings for screen readers (h4 or role), 44 px rows unaffected.
## Done when
- Under All children every Days line sits under a child or Together heading; no initials remain; one-child view unchanged; still matches the printed sheet's lines.
## Tests
- Web: grouping order, Together once, empty child omitted, no markers, sheet equality still holds.
