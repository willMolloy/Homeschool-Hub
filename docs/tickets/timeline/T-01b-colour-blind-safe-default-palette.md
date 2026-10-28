# T-01b — Colour-blind-safe default palette

**Source:** the T-01 palette report (open finding in docs/progress/timeline.md) and DeeDee's decision "default to safe"; pastel direction from DeeDee's This Week steer  
**Depends on:** T-01  
**Size:** S

## Goal
Make the default subject palette colour-blind-safe, based on Okabe–Ito with lightness varied by subject, so lanes stay distinct under protan, deutan and tritan simulation. Keep T-01's equal-lightness hues as an opt-in "vivid" set under `data-palette="vivid"`, with the same token names. Add a pastel tint per subject for the calm This Week look.

## Context
- T-01 held lightness and chroma fixed, as the Page specified. Ten equal-lightness hues are close to indistinguishable under red–green colour blindness: the minimum simulated OKLab distance was 0.011–0.023, against Okabe–Ito's 0.086–0.098.
- The metric (same as T-01): the smallest OKLab Euclidean distance between any two base subject colours, after culori's full-severity `filterDeficiencyDeuter / Prot / Trit` simulation.
- Okabe–Ito has 8 colours; one is black, which is unusable as a lane colour on the dark theme and is the text colour on light. So the seven chromatic ones are kept, and three more have to be found.
- DeeDee wants This Week to be minimal, with pastel colours. A subject's colour must match across pages, so the pastels come from the same hues as the timeline palette.
- Components read `--tl-subject-N[-light|-dark]` and the Tailwind `subject-*` colours. They must not change when the palette changes.

## Steps
1. In `apps/web/scripts/palette.ts`:
   - Add the "safe" palette:
     - The seven chromatic Okabe–Ito colours. Bluish green is 0.01 darker and reddish purple 0.01 lighter in OKLCH L, so their ±0.07 child steps keep a 4.5:1 label.
     - Three extras (wine `oklch(0.45 0.18 0)`, mint `oklch(0.89 0.12 188)`, violet `oklch(0.63 0.24 304)`), chosen by search. The search maximised the minimum simulated distance of the whole set, then each extra's distance to the rest. L was kept between 0.45 and 0.90, so nothing vanishes on either background.
   - Keep T-01's hues as the "vivid" palette, unchanged.
   - Give every swatch its own label colour (ink or paper, whichever contrasts more), replacing the single `--tl-subject-label`.
   - Add `--tl-subject-N-pastel`: the subject's hue at L 0.95 (light) / 0.32 (dark), chroma ≤ 0.035, clamped to sRGB. Text on it uses the theme's `--tl-foreground` (or `--tl-muted-foreground`).
2. Emit:
   - safe on `:root` / `[data-theme="dark"]`;
   - vivid under `[data-palette="vivid"]`, with its dark variant under `[data-theme="dark"][data-palette="vivid"]` and either nesting order.
   - The vivid blocks override subject tokens only.
   - Regenerate with `npm run tokens -w @hh/web`. The report prints both palettes next to Okabe–Ito and Paul Tol.
3. Add `src/lib/timelinePalette.ts`, a tiny helper to set or clear the attribute. Default is safe, which means no attribute.
4. Record the before/after numbers, compromises and the pastel direction in docs/progress/timeline.md.

## Done when
- [ ] With no attribute, every pair of the 10 subjects is ≥ 0.08 apart under deuteranopia, protanopia and tritanopia simulation in both themes. If 10 couldn't reach that, the best achievable would be documented, with hues repeating after N. Not needed: 10 reach it, so no hue repeats.
- [ ] `data-palette="vivid"` restores T-01's hues, with identical token names in every block.
- [ ] Every swatch's label is ≥ 4.5:1 in both palettes and both themes.
- [ ] Every pastel is ≥ 4.5:1 with both foreground and muted-foreground text.
- [ ] Opacity modifiers (`bg-subject-1/50`) still produce semi-transparent colours.
- [ ] The light and dark themes both still work.
- [ ] The committed token files match the script.

## Tests
- `apps/web/test/palette.test.ts`:
  - **Gate:** the safe minimum simulated distance is ≥ `CVD_MIN_DISTANCE` (0.08) for each simulation, in each theme. It fails if the palette drifts.
  - The safe palette starts from Okabe–Ito (hue equal, L within 0.01), and beats vivid under every simulation.
  - Vivid has fixed L/C and even hues.
  - Per palette × theme: gamut; label AA; pastel hue and AA.
  - Same token names in every block; the vivid blocks touch subject tokens only; selectors; Tailwind opacity modifiers compile to `color-mix`; the files are in sync.
- `apps/web/test/timeline-palette.test.ts`: the helper's default, set/clear, and custom root.

## Out of scope
- **A palette toggle in settings.** It lands with a later settings/timeline ticket. Only the helper exists now; nothing calls it.
- Restyling the This Week screens with the pastels. That is its own ticket; the tokens exist so it can use them.
- Mapping roster subjects onto timeline colours, and a dark-mode switch (unchanged from T-01).
- Gating the ±0.07 child steps for colour-blind distance. Only base subject colours are gated; child sub-lanes are distinguished within a subject by position and label.
- T-02 and later.
