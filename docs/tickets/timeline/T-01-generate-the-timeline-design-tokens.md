# T-01 — Generate the timeline design tokens

**Source:** the Timeline Tools Page, "Color", "Stack" and "Typography" sections, and its build-order item 1  
**Depends on:** none (pilot-independent)  
**Size:** S

## Goal
A `scripts/palette.ts` that uses culori to write the OKLCH subject colours and the light and dark CSS variables to `tokens.css`, with a contrast check in its test, plus the Tailwind v4 and shadcn/ui (Base UI) setup that will read them.

## Context
- The timeline is a hand-built SVG; the chrome around it (sheets, menus, buttons) will be shadcn/ui components. Both must read the same colours, so the colours are plain CSS variables and Tailwind maps onto them.
- Colour, from the Page:
  - 10 subject hues in OKLCH: lightness and chroma held fixed, hue evenly spaced.
  - Each child's sub-lane is a lighter or darker step of its subject's hue.
  - Check against Okabe–Ito and Paul Tol's palettes; labels stay on the bars, so colour is never the only cue.
  - Light and dark themes as CSS variables, read by Tailwind v4 and by the SVG.
  - Labels meet WCAG AA (4.5:1).
- Stack, from the Page: Tailwind CSS 4.3.3; shadcn/ui CLI v4 in the Base UI flavour (`@base-ui/react` 1.9.0, not Radix); culori 4.0.2 as a dev dependency only; React 18 stays; Tailwind v4 needs Safari 16.4+.
- Typography, from the Page: one variable font (system UI) at 12, 14 and 20 px, with tabular numbers.
- The app today: React 18.3 + Vite 5, hand-written `src/styles.css` with its own variables (`--muted` is a text colour there, `--line`, `--danger`…). Roster subject swatches live in `src/features/roster/palette.ts` (8 hex colours, user-chosen per subject).

## Steps
1. Add `tailwindcss` and `@tailwindcss/vite` (dev), `@base-ui/react`, `clsx` and `tailwind-merge`, and `culori` + `@types/culori` (dev) to `apps/web`.
2. Write `apps/web/scripts/palette.ts`:
   - pure functions for the hues, the shared chroma (the largest every hue can reach in sRGB at the base lightness), the per-child steps (base / light / dark), the chrome colours, contrast and colour-distance helpers;
   - `npm run tokens -w @hh/web` writes `src/styles/tokens.css` (plain `--tl-*` variables; light on `:root`, dark under `[data-theme="dark"]`) and `src/styles/tokens.theme.css` (a Tailwind `@theme inline` map onto them), and prints the Okabe–Ito / Paul Tol comparison.
3. Add `src/styles/tailwind.css`: Tailwind's theme and utilities layers (no Preflight, automatic class detection off), then the two token files. Import it in `main.tsx` before `styles.css`.
4. Set up shadcn/ui for Base UI: `components.json` (`base-nova`, Tailwind v4, CSS variables), the `@/` alias in tsconfig, Vite and Vitest, and `src/lib/utils.ts` with `cn()`. Add no components yet.
5. Type tokens: `--tl-text-sm/md/lg` = 12 / 14 / 20 px, `--tl-numeric: tabular-nums`, exposed to Tailwind as `text-label`, `text-body`, `text-title`.

## Done when
- [ ] The existing screens look exactly as before (no Preflight, no utilities generated from their class names).
- [ ] `tokens.css` holds 10 hues × 3 steps per theme, all inside sRGB, with fixed lightness and chroma on the base step.
- [ ] The label colour meets 4.5:1 on every swatch in both themes, and every chrome text pair meets 4.5:1.
- [ ] The committed token files match what the script generates.
- [ ] The comparison with Okabe–Ito and Paul Tol is recorded in docs/progress/timeline.md.

## Tests
- `apps/web/test/palette.test.ts`: hue spacing; fixed L and C; steps keep the hue; sRGB gamut; label and chrome contrast ≥ 4.5:1 in both themes; a normal-vision distinctness floor; the reference palettes run through every vision simulation; the committed CSS matches the script; dark theme is opt-in; type sizes; every variable is `--tl-*`.
- `apps/web/test/tailwind-setup.test.ts`: no Preflight, `source(none)`, the token imports, `components.json` is a Base UI style, `cn()` merging.

## Out of scope
- No chart, Gantt or timeline libraries, now or later: the timeline is hand-built SVG.
- Adding any shadcn/ui component (they arrive one at a time, with the ticket that needs them).
- Mapping roster subjects onto the new palette, or replacing the roster swatches.
- A dark-mode switch, or following the OS setting.
- Self-hosting Inter Variable (system UI is used).
- Timeline tickets T-02 and later (see the README for the order).
