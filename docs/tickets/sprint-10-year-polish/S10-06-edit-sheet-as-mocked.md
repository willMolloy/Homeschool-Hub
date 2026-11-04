# S10-06 — The Year edit sheet as mocked
**Source:** UX review "Year drift"; mockup frame 4 · **Depends on:** S10-01 · **Size:** S

## Goal
Selecting a bar outlines it and opens the edit sheet with date tiles, a rounded pace line, and Copy · More.

## Context
- Today the sheet uses native date fields and shows unrounded numbers.
- The shared `DateField` from earlier sprints is the custom date picker.

## Steps
1. Show Start and End as date tiles ("Oct 19, 2026") that open the shared `DateField`.
2. Add a pace line, for example "About 20 pages a day · 40 min", using rounded values only.
3. Draw a 2 px outline on the chosen bar.
4. Put the actions in a Copy · More row.

## Done when
- At 360 px, selecting a bar shows the outline and the sheet as mocked.
- Dates change through the tiles.
- Only what's essential: the sheet keeps its behaviour and saves the same data.

## Tests
- Web: the tiles use `DateField`; the pace line rounds; the outline shows on selection.

## Out of scope
- The desktop side panel (S10-18).
