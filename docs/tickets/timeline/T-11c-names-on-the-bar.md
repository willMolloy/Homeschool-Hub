# T-11c — Names straight on the bar

**Source:** DeeDee: "The part of the bar that has the title has more opacity than the rest of the bar." At 0.91, 18 of 240 label/bar combinations missed AA, all in the safe palette. DeeDee chose option 1: adjust those colours, then remove the patch. **Depends on:** T-11b. **Size:** S.

## Goal

Every label meets AA 4.5:1 on its bar as drawn (0.91 opacity, light and dark, over the page and over cards), so names sit straight on the bar with no patch.

## Steps

1. `scripts/palette.ts`: `SAFE_AA_NUDGE`, the smallest lightness move per failing safe swatch, per theme; regenerate `tokens.css`.
2. `Timeline.tsx` / `timeline.css`: drop the `tl-name-patch` rect and its rule.
3. `names.ts` / `layout.ts`: drop the thin-piece fallback (a patch taller than the piece). Without a patch its text would spill onto the page.

## Done when

- [ ] No name patch is rendered.
- [ ] All 240 combinations (2 palettes × 2 themes × 30 swatches × page and card) meet AA at 0.91, and at 1 for the selected bar.
- [ ] Colour-blind floors hold: 0.08 for tokens, 0.065 as drawn, and within 0.01 of Okabe–Ito as drawn.
- [ ] Every child's steps stay in order, at least 0.042 apart.
- [ ] Vivid is unchanged.
- [ ] **Only what's essential:** nothing else changes.

## Tests

- `apps/web/test/palette.test.ts`: AA on every bar as drawn (240 combinations) and solid; nudges at most 0.05; child step order and gap; the existing CVD floors.
- `apps/web/test/timeline-names.test.tsx`: no patch is drawn and each name group is one text; a piece thinner than 13 px has no name.
