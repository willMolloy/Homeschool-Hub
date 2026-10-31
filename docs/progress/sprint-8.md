# Sprint 8 progress: Soft Paper

Tickets: `docs/tickets/sprint-8-soft-paper/`. S8-10 (tester pass) is the tester's. Before shots (the old look, 360 px) are in `screens/sprint-8/before-*.png`; after shots are added as each screen changes.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S8-01 Soft Paper tokens, fonts and subject colours | 26f3c28 | `scripts/palette.ts` now generates the Soft Paper tokens; `styles/tokens.css` (hex), `tokens.theme.css`; fonts via `@fontsource-variable/fraunces` (`soft.css`) and `nunito-sans` (`wght.css`) imported in `tailwind.css`; `styles.css` aliases the old names to tokens |
| S8-02 Light, dark and system themes | (this commit) | `lib/theme.ts` (`hh.theme` in localStorage, try/catch), `settings/AppearanceChoice.tsx` on Family settings, pre-paint script and page colour in `index.html`, `color-scheme` from the theme in `styles.css` |

## Decisions (conservative calls on ambiguous points)

- **S8-01 one palette, eight slots.** The old "safe" (Okabe-Ito, 10 subjects, three steps) and "vivid" palettes are replaced by the eight Soft Paper hues (honey, sky, mint, butter, blue, coral, lilac, sage). `PALETTE_SLOTS` is 8, so the timeline deals slots 1-8 then repeats (a 9th subject reuses honey). Nothing in the app switched to "vivid" (no UI), so `applyTimelinePalette`, `data-palette` and their test are deleted.
- **S8-01 the colour-blind distance tests are gone.** The pastel fills are deliberately close in lightness, so the T-01b pairwise-distance floor (and the T-11c nudge tables) no longer apply. Replaced by: ink on every fill, the bar's amount text, strong tone against fill (3:1), each child step's label (AA). Subjects are told apart by their icon (S8-11), never by colour alone.
- **S8-01 contrast numbers.** Light fills: ink at least 9:1 and the bar's amount (ink at 78%) at least 5.2:1, as the README says. The mockup's own dark fills give ink 6.8-7.4:1 on honey and butter, so dark asserts at least 6.5:1 and the amount text is ink at 86% in dark (`--tl-bar-secondary-opacity` per theme) to hold 5.2:1. Dark field borders (`input`) were lightened to `#7A7266` to reach 3:1.
- **S8-01 bars are solid.** `--tl-bar-opacity` is 1 (T-08c's 0.91 is gone: the fills already carry the 14%/10% mix). Dimmed bars (selection) go from 0.65 to 0.7 so page text on them keeps AA with the new ink.
- **S8-01 swatch mapping** (the stored colour is unchanged; it is only drawn differently by `ColorDot` and the picker chips): Ochre to honey, Teal to sky, Green to mint, Pink to butter, Blue to blue, Brick to coral, Purple to lilac, Slate to sage. Timeline lanes keep dealing slots by display order (as before), not by the subject's stored colour, so existing timeline behaviour and tests are unchanged.
- **S8-01 child steps.** A subject drawn once per child uses the fill (base), the fill 40% toward the card (light, 14% in dark) and the fill 16% toward its strong tone (dark, 10% in dark).
- **S8-01 changed test expectations.** `palette.test.ts` rewritten for the new generator (reasons above); `css-contrast.test.ts` reads colours through the generated tokens (the app CSS now uses `var(--tl-*)`), the desktop nav's translucent active fill went from 0.16 to 0.1 white to keep AA on fern; `timeline-opacity.test.ts` (solid bars, dim 0.7, all swatches AA when dimmed); `timeline-model.test.ts` (slots repeat after 8, not 10).
- **S8-02 System sets no attribute.** Light and Dark set `data-theme` on `<html>`; System removes it, so the tokens follow `prefers-color-scheme` (`:root:not([data-theme="light"])`). The pre-paint script in `index.html` only needs to act for a saved Light or Dark. It also paints the page colour (cream, or charcoal under the device's dark setting) before the stylesheet loads.
- **S8-02 where Appearance lives.** On Family settings (a card under the form, applies at once, no Save). Home's avatar menu (S8-04) links to Family settings; it does not duplicate the control.
- **S8-02 changed test expectation.** `css-contrast.test.ts` "declares the app light-only" is now "lets native controls follow the theme": `color-scheme: light dark` on `:root`, `light` / `dark` under the two `data-theme` values, and `light dark` in the meta tag (the whole point of the ticket).
- **S8-02 dark contrast of older screen CSS** is checked in S8-03, which replaces their hard-coded colours with tokens.
