# S15-03 — The viewer's Schedule and Records
**Size:** M
## Steps
1. A viewer shell: the bar/rail shows **Schedule** and **Records** only, with a small "View only" label and the family name; no Home, Set up or family menu.
2. Schedule (Week and Year): change week, zoom and child; bars open a read-only detail (title, dates, pace line) with no edit, Copy, More, Update status or completion buttons; no "+" or pencil. **Print sheets is allowed** (read-only).
3. Records: change the range and child; totals and entries read-only (no Log, edit, delete or undo); Export (CSV) and Term in review (save/print) allowed.
4. Nothing editable is rendered at all (not just disabled).
## Done when
- A viewer can look at everything on Schedule and Records for any child and range, print and export, and finds no way to change anything, at 320, 360 and 1280 px in light and dark.
## Tests
- Web: no edit controls in viewer mode on each screen; navigation limited to the two tabs.
