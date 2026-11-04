# S10-05 — Breaks as a wash over the bars
**Source:** mockup; Will's decision 2 (2026-11-01) · **Depends on:** S10-02 · **Size:** S

## Goal
Bars run straight through breaks, and each break is drawn as a band washed over them.

## Context
- Will approved this on 2026-11-01: bars run **through** breaks.
- The wash is 72 % in light and 50 % in dark, from a `--wash` token.

## Steps
1. Add the `--wash` token in light and dark.
2. Draw breaks as one layer above the bars, and stop splitting bars at breaks.

## Done when
- Winter break shows as a soft band across every lane, with the bars unbroken beneath it, in both themes.
- Only what's essential.

## Tests
- Web: the wash layer is drawn above the bars, and bars are not split at breaks.

## Out of scope
- Editing breaks.
