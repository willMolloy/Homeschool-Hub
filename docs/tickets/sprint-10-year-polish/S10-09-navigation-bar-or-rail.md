# S10-09 — Navigation: a bottom bar or an icon rail
**Source:** DeeDee's decision 3 (2026-11-03); UX review improvement 6 · **Depends on:** S10-01 · **Size:** S

## Goal
Under 600 px the app shows the bottom bar, and at 600 px and wider it shows a compact 80 px icon rail on the left. Both hold the same top-level items, Set up included.

## Context
- **Decided by DeeDee, 2026-11-03:**
  - a bottom bar under 600 px;
  - a compact 80 px icon rail at 600 px and up;
  - no labelled sidebar;
  - never the bar and the rail together;
  - the same top-level items in both: Home, Schedule, Records and Set up.
- This replaces year-polish-notes decision 8 (a sidebar at 1024 px and up, a rail at 600–1023).
- Today `TABS` in `layout/nav.tsx` is Home, Schedule and Records. Set up is reached from a row on Home. **Changed 2026-11-04 (DeeDee):** once Set up is in the bar and the rail, Home's Set up row goes, so there is one way to do each thing. This is Sprint 10b scope.
- Follows [Material 3 navigation rail guidelines](https://m3.material.io/components/navigation-rail/guidelines) and [canonical layouts](https://m3.material.io/foundations/layout/canonical-layouts).

## Steps
1. Add Set up to `TABS`, with the icon used on Home's Set up row (`SlidersHorizontal`) and a path of `/setup`, so it is active on `/setup` and every `/setup/*` screen.
2. Under 600 px, keep the bottom bar as it is, now with four items.
3. At 600 px and up, hide the bar and show an 80 px rail:
   - fixed on the left;
   - icons centred, each with its short label beneath in small text, as Material 3 shows (confirmed by DeeDee, 2026-11-03);
   - each item at least 44 × 44 px with an accessible name;
   - the active item gets a pill, as on the bar.
4. Drop Home's Set up row (2026-11-04), and update any test or smoke scenario that reached Set up through it so it uses the bar or the rail.
5. Make the content area start after the rail and drop the bottom padding that kept content clear of the bar. Sheets keep the S10-01 layers.

## Done when
- At 390 px the bottom bar shows four items and no rail.
- At 600, 800 and 1280 px the rail shows and the bar does not.
- At no width are both visible.
- Home has no Set up row; Set up is reached from the bar or the rail.
- Only what's essential: navigation only, with page widths left to S10-16.

## Tests
- Web:
  - which navigation shows at 599 and 600 px;
  - the same items in the same order in both;
  - Set up is active on `/setup/subjects`;
  - Home has no Set up row.

## Out of scope
- A labelled sidebar.
- Content widths (S10-16), the Home panes (S10-17) and the side panel (S10-18).
