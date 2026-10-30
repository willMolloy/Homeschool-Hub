# T-11b — Name a later piece at 2× its name

**Source:** the per-child screenshots (Frank, Fall, 1280 px): Black Beauty's piece after Thanksgiving had room for its name but none. DeeDee approved. **Depends on:** T-11. **Size:** XS.

## Goal

Zoomed out, a later piece of a bar is named when it is at least 2× its name's width (was 3×).

## Steps

1. `names.ts`: `LATER_PIECE_NAME_FACTOR` 3 → 2.

## Done when

- [ ] In Frank's Fall view at 1280 px, Black Beauty's piece after Thanksgiving is named.
- [ ] **Only what's essential:** nothing else changes.

## Tests

- `apps/web/test/timeline-names.test.tsx`: the sparse rule at 2× (a piece between 2× and 3× is now named); the demo family's Black Beauty in Frank's Fall view on a 912 px plot (the 1280 px page) gets a name on both pieces.
