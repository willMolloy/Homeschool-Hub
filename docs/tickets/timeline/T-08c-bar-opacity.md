# T-08c — Bar opacity halfway to solid

**Source:** DeeDee (2026-10-28): "let's get the opacity on non highlighter bars increased halfway to the full density." **Depends on:** T-08b. **Size:** S.

## Goal

Bars read as denser colour while staying slightly see-through, and a selection still stands out.

## Steps

1. `scripts/palette.ts`: `BAR_OPACITY` 0.82 → 0.91; regenerate `tokens.css`.
2. `timeline.css`: `.tl-dim` 0.3 → 0.65. Selected stays at 1.
3. Re-run the colour-blind and contrast tests.

## Done when

- [ ] Unselected bars draw at 0.91, dimmed bars at 0.65 of that, and the selected bar is solid.
- [ ] The palette's colour-blind and label-contrast tests pass with no threshold changed.
- [ ] **Only what's essential:** nothing else changes.

## Tests

- `apps/web/test/timeline-opacity.test.ts`, and `apps/web/test/palette.test.ts` (updated to pin 0.91).
