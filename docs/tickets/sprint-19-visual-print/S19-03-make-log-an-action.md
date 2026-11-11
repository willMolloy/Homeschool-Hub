# S19-03 — Make Log an action

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** XS

## Goal

The Log control on Records reads as a button she presses, not as a tab she is already on.

## Context

Records puts Log beside Export and Term in review. Log is drawn as the filled primary pill. That highlight is the same idea as a selected tab, so it looks as if Log were the current page.

## Steps

1. Log does not use the selected-tab treatment: no pressed state, no selected-chip ring, and not the filled "you are here" pill.
2. Pressing it still opens the log sheet, as it does now.
3. **Default, not a blocker:** draw Log as a secondary button, label still "Log", in the same row as Export.

## Done when

- On Records, Log looks like an action next to Export, and it still opens the log sheet.
- Nothing else on the row moves or gets a new name.

## Tests

- Web: Log is a button, not `aria-pressed` and not a chip; activating it opens the log sheet. At 390 and 1280 px, light and dark.

## Out of scope

- What the log form asks (Sprint 20).
- Adding a Log tab to the bar or the rail.
