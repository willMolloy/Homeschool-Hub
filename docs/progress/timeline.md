# Timeline progress

Tickets: `docs/tickets/timeline/`. Source: the Timeline Tools Page. Only T-01 is pilot-independent; T-02 onwards wait for the pilots.

| Ticket | Commit | Notes |
|--------|--------|-------|
| T-01 Generate the timeline design tokens | (this commit) | `scripts/palette.ts` → `src/styles/tokens.css` + `tokens.theme.css`; Tailwind v4 without Preflight; shadcn/ui `base-nova` config + `cn()`; no components yet |

## Decisions (conservative calls on ambiguous points)

- **The existing screens must not change.** Tailwind's Preflight is not imported, and automatic class detection is off (`source(none)`): with it on, Tailwind turned the existing plain class names ("grid", "hidden", "table", "border", "ring"…) into utilities. Only `src/components/ui` and `src/features/timeline` are scanned (neither exists yet). Utilities live in a cascade layer, so `styles.css` still wins where both apply. Built CSS grows 4.03 → 4.85 KB gzip (the token variables); JS is unchanged.
- **Every new variable is `--tl-*`.** `styles.css` already uses `--muted` as a text colour, while shadcn's `--muted` is a background. Rather than rename either, shadcn's semantic names are mapped in Tailwind (`--color-muted: var(--tl-muted)`), so components use `bg-muted` / `text-muted-foreground` with no clash. When the shadcn CLI adds a component and offers to write its own `:root` variables into `tailwind.css`, decline that part.
- **Type sizes are named, not remapped.** `text-label` / `text-body` / `text-title` = 12 / 14 / 20 px; Tailwind's own `text-sm` etc. keep their defaults, which shadcn components assume.
- **Dark theme is opt-in** (`[data-theme="dark"]`), not tied to the OS setting: the rest of the app has no dark mode, and a timeline that turns dark alone would look broken. Who sets the attribute is a later ticket.
- **Per-child steps: three** (base, lighter, darker) per subject. Chroma is fixed across hues at the largest value every hue can reach in sRGB at the base lightness (light 0.101, dark computed the same way); a lighter or darker step lowers chroma only where that hue can't reach it there. Families with more than three children on one subject are a T-02 question.
- **Font: system UI.** The Page allows system UI or a self-hosted Inter Variable; system UI costs no bytes and matches the current app.
- **Roster swatches untouched.** Subjects keep their user-chosen hex colours; how a subject maps to one of the 10 timeline hues is a product decision for the lanes ticket.
- **shadcn/ui set up by hand, not with `shadcn init`.** `init` rewrites the CSS entry and adds Preflight plus its own variables, which would conflict with the two rules above. `components.json` (style `base-nova`, Tailwind v4, CSS variables, `@/` aliases), `@base-ui/react`, `clsx`, `tailwind-merge` and `cn()` are what `add` needs. No component is added yet.

## Palette report (Okabe–Ito and Paul Tol comparison)

`npm run tokens -w @hh/web` prints the smallest OKLab distance between any two hues (higher = easier to tell apart), using culori's colour-vision simulations:

| Vision | Ours, light | Ours, dark | Okabe–Ito | Paul Tol bright |
|---|---|---|---|---|
| normal | 0.062 | 0.047 | 0.156 | 0.106 |
| deuteranopia | 0.011 | 0.012 | 0.098 | 0.093 |
| protanopia | 0.023 | 0.016 | 0.086 | 0.072 |
| tritanopia | 0.019 | 0.012 | 0.096 | 0.043 |

**Open finding for DeeDee:** with lightness and chroma held fixed (as the Page specifies), 10 hues are much closer together than the reference palettes, and under red–green colour blindness some pairs are close to indistinguishable. That's expected for an equal-lightness palette and is why the Page keeps labels on every bar. The tokens follow the Page as written; the test gates contrast and a normal-vision floor, and reports (doesn't gate) the colour-blind numbers. If colour-blind separation should matter more, the options are fewer hues or varying lightness across subjects; that's a design change, so it's not made here.
