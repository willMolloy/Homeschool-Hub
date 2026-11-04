# S10-01 — Sheets sit above the tab bar
**Source:** year-polish-notes "Must not get wrong" · **Depends on:** none · **Size:** XS

## Goal
Every bottom sheet and dialog is drawn above the tab bar, never under it.

## Context
- The tab bar is `position: fixed` with `z-index: 10` (`layout/app-shell.css`). Sheets set their own layers, so some can end up under the bar and hide their buttons.
- One shared set of z-index tokens fixes this for every sheet, now and later.

## Steps
1. Add layer tokens in one place (for example `--z-nav`, `--z-sheet`, `--z-dialog`, `--z-toast`) and use them for the tab bar, every sheet, dialogs and the undo bar.
2. Check the Year edit sheet, Update status, the subject picker, the child sheet and the Log sheets.

## Done when
- At 360 and 1280 px, those sheets are fully visible and nothing covers their buttons.
- Only what's essential: tokens and the changed layers, no other restyling.

## Tests
- Web: a sheet's layer token is above the tab bar's, and every sheet uses the shared tokens.

## Out of scope
- How sheets look, and the desktop side panel (S10-18).
