# S9b-05 — Small fixes from the Sprint 9 tester
**Findings:** N6, N7, N9–N17, S9-05 partial · **Size:** S
## Steps
1. N6: the CSV includes "Last day" only if ticked (offer it as a column); the Totals CSV starts with the date range.
2. N7: fields never typed show as blank or are left out, never "0 m".
3. N9: at 320 px: calendar day cells at least 44 px (or the calendar fills the width), hours boxes keep "h"/"m" on one line, big numbers don't wrap, the placeholder clears the icon.
4. N10: "Reset Fall to default" button's accessible name starts with its visible text.
5. N11: long term names truncate with "…" in the zoom row and the row shows a fade at its edge when it scrolls.
6. N12: a family with no children sees "Add a child first" with a link instead of the Log form.
7. N13: Edit zoom views and Records show the same Spring end date (one source).
8. N14: the CSV starts with a UTF-8 byte-order mark.
9. N15: the state-laws link uses the accent style; "Count as a school day" is a switch.
10. N16: an entry with the switch off says "not counted as a school day" in its summary.
11. N17: after Undo, Records keeps the chosen range and child.
12. S9-05: the demo seed includes one assignment that is forecast late, so the demo family shows a briefing line.
## Done when
- Each item is fixed with a test.
