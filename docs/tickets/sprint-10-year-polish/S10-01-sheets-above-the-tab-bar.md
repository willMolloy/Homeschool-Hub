# S10-01 — Sheets sit above the tab bar
**Source:** year-polish-notes "Must not get wrong" · **Size:** XS
## Goal
Every bottom sheet and dialog is drawn above the tab bar, never under it.
## Done when
- At 360 and 1280 px, the Year edit sheet, Update status, the subject picker, the child sheet and Log sheets are fully visible with nothing covering their buttons.
## Tests
- Web: sheet layer is above the tab bar (shared z-index tokens).
