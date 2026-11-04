# S10-18 — The Year edit sheet as a side panel on wide screens
**Source:** DeeDee's decision 3 (2026-11-03); mockup desktop frame · **Depends on:** S10-06, S10-16 · **Size:** S

## Goal
At 840 px and wider, selecting a bar opens the edit sheet as a side panel of about 340–412 px. The panel pushes the timeline over and stays open while other bars are tapped.

## Context
- **Decided by DeeDee, 2026-11-03:**
  - the edit sheet becomes a side panel of about 340–412 px that pushes the timeline;
  - it stays open while other bars are tapped;
  - it closes with Esc, ×, or a click on empty space.
- 840 px is where both the panel and a usable timeline fit beside the 80 px rail. Below that, the bottom sheet stays.
- Follows the supporting pane in [Material 3 canonical layouts](https://m3.material.io/foundations/layout/canonical-layouts).

## Steps
1. At 840 px and up, show the sheet's content (S10-06) in a right-hand panel, 360 px wide (within 340–412). It has no backdrop, and the timeline narrows beside it.
2. Tapping another bar swaps the panel's content and moves the outline. The panel stays open.
3. Close the panel with Esc, the × button (44 px, named "Close"), or a click on empty timeline space. Focus returns to the bar that was selected.
4. Opening the panel moves focus to its heading. It is not modal, so the timeline stays usable.

## Done when
- At 1280 px, selecting bars one after another updates one open panel, and Esc, × and an empty-space click each close it.
- At 800 and 390 px the bottom sheet is unchanged.
- Only what's essential.

## Tests
- Web:
  - the panel versus the sheet by width;
  - the content swaps on another bar;
  - all three ways of closing;
  - focus on open and on close.

## Out of scope
- New fields in the sheet.
- Dragging (stays off).
