# S10-14 — Set up gets a 44 px back link
**Source:** UX review improvement 10 (DeeDee's decision 5, 2026-11-03) · **Depends on:** S10-09 · **Size:** XS

## Goal
The Set up page gets a back link to Home with a 44 px target, and its navigation shows exactly one active item.

## Context
- **Decided by DeeDee, 2026-11-03:** ticket UX review improvement 10. Set up gets a back link and shows an active state, with a 44 px back target.
- Today:
  - `/setup` (`SetupPage.tsx`) has no back link;
  - no navigation item is active there, because Set up is not in `TABS` and Home uses `end`;
  - every `/setup/*` screen already has "‹ Set up" (`BackToSetup`, `min-height: 44px`).
- UX review improvement 10 asked for Home to be active on Set up. Since DeeDee's decision 3 puts Set up in the bar and the rail (S10-09), **Set up is the active item there**. Showing Home active as well would mark two items.

## Steps
1. Add "‹ Home" at the top of `/setup`, styled like `BackToSetup`, with a target of at least 44 × 44 px.
2. Make `BackToSetup` reach at least 44 px wide as well as tall.
3. Check that the Set up item is `aria-current="page"` on `/setup` and every `/setup/*` screen, in the bar and the rail.

## Done when
- At 360 and 1280 px, `/setup` shows "‹ Home".
- Both back links measure at least 44 × 44 px.
- Exactly one navigation item is active on every Set up screen.
- Only what's essential.

## Tests
- Web: the back link and its target; the active item on `/setup` and `/setup/children`.

## Out of scope
- Restructuring the Set up list.
