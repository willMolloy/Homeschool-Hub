# S8-01 — Soft Paper tokens, fonts and subject colours

**Source:** Sprint 8 README; `design/ux-research.md` §4 (Soft Paper, shared subject pastels); the mockup `design/mockups/soft-paper.html`  
**Depends on:** none  
**Size:** M

## Goal
One set of design tokens defines the Soft Paper look in light and dark, with the fonts and the richer subject colours, so every screen can use them.

## Context
- Tokens live in `apps/web/src/styles/tokens.css` / `tokens.theme.css` (Tailwind v4, shadcn `base-nova`); `styles.css` sets `color-scheme: light`. The timeline palette has its own tokens (T-01, T-01b) and the subject swatch picker uses them.

## Steps
1. Add Soft Paper tokens as CSS variables mapped to the shadcn/Tailwind names (background, card, foreground, muted, primary = fern, border = hairline, ring, radius 14 px, bar radius 12 px), with a dark set under `[data-theme="dark"]` and `prefers-color-scheme: dark` (S8-02 switches them).
2. Self-host the fonts for the PWA (`@fontsource-variable/fraunces`, `@fontsource-variable/nunito-sans` or the non-variable packages): Fraunces for page titles and greetings, Nunito Sans for body and controls.
3. Subject colours: the eight subject hues get a **fill**, a **strong** tone and dark equivalents. Light fills (14% toward strong): honey `#F0D6A8`, sky `#BDDCF0`, mint `#B5DFD1`, butter `#EAE2A5`, blue `#C1D0EA`, coral `#F0C8B4`, lilac `#E5C8DB`, sage `#D1D5C9`; strong tones and dark fills (10% toward strong) as in the mockup. Map the existing subject palette swatches onto these so current subjects keep their identity (record the mapping); the timeline bars use the same fills.
4. Extend the contrast test (`apps/web/test/css-contrast.test.ts`) to check ink and bar text on every fill in both themes (AA), and the strong tone against its fill (3:1).

## Done when
- Tokens exist for both themes; the fonts load offline; subject fills and strong tones come from one place; contrast tests pass in both themes.

## Tests
- The contrast test for every pair; existing palette tests updated (say which).

## Out of scope
- Restyling components (S8-03) and screens.
