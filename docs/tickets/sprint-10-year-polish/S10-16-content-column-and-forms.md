# S10-16 — A centred content column with single-column forms
**Source:** DeeDee's decision 3 (2026-11-03); UX review improvement 6 · **Depends on:** S10-09 · **Size:** S

## Goal
On wide screens, Home, Records, Set up, forms, buttons and segmented controls sit in a centred column of about 480–640 px, while the Year timeline uses the full width.

## Context
- **Decided by DeeDee, 2026-11-03:**
  - the Year timeline uses the full width;
  - Home, Records, Set up, forms, buttons and segmented controls are capped in a centred column of about 480–640 px;
  - forms are single-column with labels above, and only short related pairs (start and end date) sit side by side;
  - margins and gaps are 24 px on large screens;
  - no widget dashboard.
- Today `.shell-main` caps every page at 960 px, so on a desktop, buttons and segmented controls stretch like a phone layout.
- Follows [Material 3 canonical layouts](https://m3.material.io/foundations/layout/canonical-layouts) and [NN/g web form design](https://www.nngroup.com/articles/web-form-design/).

## Steps
1. Add width tokens: `--content-max: 640px` for pages and `--form-max: 480px` for forms, buttons and segmented controls. Centre both.
2. Apply `--content-max` to Home (single-pane widths), Records and Set up. Apply `--form-max` to every form and to stand-alone button rows and segmented controls.
3. Let Schedule · Year (the timeline) use the full width beside the rail.
4. Forms: one column with labels above. Only short related pairs (start and end date) may sit side by side. Fix any form that does otherwise.
5. Margins and gaps: 24 px at 600 px and up, as today below that.

## Done when
- At 1280 px, the content of Home, Records and Set up is no wider than 640 px and centred, every form is no wider than 480 px, and the timeline fills the width.
- At 390 px nothing changes.
- Only what's essential: widths and form layout, with no new widgets or dashboard.

## Tests
- Web: the width tokens apply to the named pages and to forms; Year is not capped; the form layout rule (labels above, only date pairs side by side).

## Out of scope
- Home's two panes (S10-17) and the side panel (S10-18).
