# S5-08 — A compact edit bar on phones

**Source:** ROADMAP.md, "Phone finishing pass"  
**Depends on:** none  
**Size:** S

## Goal
On a phone, the timeline edit bar takes as little height as possible while keeping every control usable.

## Context
- `features/timeline/EditBar.tsx` and `timeline.css`. Sprint 3a added Copy; the end-date steps wrap onto a second row at 360 px.

## Steps
1. At widths up to 480 px, lay the edit bar out in at most two rows: the assignment name and close on top; the date steps, Copy and other actions in one horizontally scrollable row below, each at least 44 px tall.
2. The bar must not cover the selected bar: the timeline scrolls so the selection stays visible above it.

## Done when
- At 360 px and 390 px the bar is at most two rows and every control is at least 44 by 44 px.
- Wider screens look as before.

## Tests
- Web: the controls render in the documented order with accessible names. The sizes are checked in the tester's browser pass at 360 and 390 px.

## Out of scope
- Redesigning the edit controls.
