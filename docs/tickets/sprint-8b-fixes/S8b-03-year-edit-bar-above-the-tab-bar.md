# S8b-03 — The Year edit bar sits above the tab bar on every width

**Finding:** S8 tester N3 (High): from 640 px up, `.tl-edit {bottom:0}` puts the edit bar behind the tab bar, so Start, End, Copy and More can't be clicked on a laptop.  
**Depends on:** none  
**Size:** XS

## Goal
The edit bar is fully visible and clickable at every width.

## Steps
1. Offset the edit bar by the tab bar's height (one shared CSS variable) at every breakpoint, and check the undo bar uses the same offset.

## Done when
- At 1280 px a selected bar's Start, End, Copy and More all click; same at 360.

## Tests
- Web: the edit bar's bottom uses the tab-bar variable at the desktop breakpoint.
