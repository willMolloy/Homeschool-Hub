# Timeline progress

Tickets: `docs/tickets/timeline/`. Source: the Timeline Tools Page. DeeDee dropped the parent pilot gate (they will test the timeline themselves), so T-02 onward are built in the Page's order.

| Ticket | Commit | Notes |
|--------|--------|-------|
| T-01 Generate the timeline design tokens | 9df15da | `scripts/palette.ts` → `src/styles/tokens.css` + `tokens.theme.css`; Tailwind v4 without Preflight; shadcn/ui `base-nova` config + `cn()`; no components yet |
| T-01b Colour-blind-safe default palette | a58731e | Okabe–Ito-based "safe" palette is the default; T-01 hues kept as `data-palette="vivid"`; per-swatch label tokens; `--tl-subject-N-pastel` tints; `src/lib/timelinePalette.ts` helper (no UI) |
| T-02 Timeline view model | (this commit) | `features/timeline/{grid,marks,model}.ts`: subject lanes → child sub-lanes, daily + weekly-smoothed thickness per assignment on one daily grid, breaks, event days, Today, totals. Pure; nothing renders yet |

## Decisions (conservative calls on ambiguous points)

- **The existing screens must not change.** Tailwind's Preflight is not imported, and automatic class detection is off (`source(none)`): with it on, Tailwind turned the existing plain class names ("grid", "hidden", "table", "border", "ring"…) into utilities. Only `src/components/ui` and `src/features/timeline` are scanned (neither exists yet). Utilities live in a cascade layer, so `styles.css` still wins where both apply. Built CSS grows 4.03 → 4.85 KB gzip (the token variables); JS is unchanged.
- **Every new variable is `--tl-*`.** `styles.css` already uses `--muted` as a text colour, while shadcn's `--muted` is a background. Rather than rename either, shadcn's semantic names are mapped in Tailwind (`--color-muted: var(--tl-muted)`), so components use `bg-muted` / `text-muted-foreground` with no clash. When the shadcn CLI adds a component and offers to write its own `:root` variables into `tailwind.css`, decline that part.
- **Type sizes are named, not remapped.** `text-label` / `text-body` / `text-title` = 12 / 14 / 20 px; Tailwind's own `text-sm` etc. keep their defaults, which shadcn components assume.
- **Dark theme is opt-in** (`[data-theme="dark"]`), not tied to the OS setting: the rest of the app has no dark mode, and a timeline that turns dark alone would look broken. Who sets the attribute is a later ticket.
- **Per-child steps: three** (base, lighter, darker) per subject. *(Vivid palette; see T-01b for the safe default.)* Chroma is fixed across hues at the largest value every hue can reach in sRGB at the base lightness (light 0.101, dark computed the same way); a lighter or darker step lowers chroma only where that hue can't reach it there. Families with more than three children on one subject are a T-02 question.
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

**Finding (resolved by T-01b):** with lightness and chroma held fixed, as the Page specified, the 10 hues are much closer together than the reference palettes. Under red–green colour blindness some pairs were close to indistinguishable. DeeDee chose to default to a colour-blind-safe palette, so that is now T-01b, below. T-01's hues remain as the opt-in "vivid" set.

## T-01b — colour-blind-safe default palette

Same metric: the smallest OKLab distance between any two of the 10 base subject colours, after culori's full-severity simulation. `npm run tokens -w @hh/web` prints it.

| Vision | Old default (vivid), light | Old default (vivid), dark | **New default (safe), both themes** | Okabe–Ito (8) | Paul Tol bright |
|---|---|---|---|---|---|
| normal | 0.062 | 0.047 | **0.156** | 0.156 | 0.106 |
| deuteranopia | 0.011 | 0.012 | **0.094** | 0.098 | 0.093 |
| protanopia | 0.023 | 0.016 | **0.088** | 0.086 | 0.072 |
| tritanopia | 0.019 | 0.012 | **0.086** | 0.096 | 0.043 |

All 10 subjects clear the 0.08 target, so **no hue repeats**. The lane label stays on every bar as the backup cue anyway. `test/palette.test.ts` fails if any simulated minimum drops below `CVD_MIN_DISTANCE` (0.08).

The safe palette, as base hex: #e69f00 orange, #56b4e9 sky blue, #009b70 bluish green, #f0e442 yellow, #0072b2 blue, #d55e00 vermillion, #cf7caa reddish purple, then the extras #9c0451 wine, #6cf4e9 mint and #aa53fb violet.

Contrast:
- Lowest label contrast on any swatch: 4.58:1 (safe), 5.07:1 (vivid).
- Lowest text contrast on any pastel: 14.8:1 (light) / 10.8:1 (dark) with `--tl-foreground`, and 5.8 / 5.6:1 with `--tl-muted-foreground`.

Decisions and compromises (conservative calls):
- **Okabe–Ito minus black, plus three extras.** Black can't be a lane on the dark theme and is the text colour on light. The extras (wine, mint, violet) came from a search that maximised the set's worst simulated pair, then each extra's distance to the rest (each is ≥ 0.12 from every other colour). They are not Okabe–Ito colours.
- **Two Okabe–Ito colours are nudged by 0.01 L.** Bluish green is darker and reddish purple lighter, so their lighter and darker child steps still carry a 4.5:1 label. Hues are exact.
- **Lightness kept between 0.45 and 0.90.** Unconstrained, the search reached for near-black and near-white colours that vanish on one of the two backgrounds.
- **The safe palette is the same in light and dark.** Okabe–Ito is defined as fixed colours, and every one stays visible on both backgrounds, so the CVD numbers are identical in both themes. Vivid keeps its per-theme lightness from T-01.
- **Labels are per swatch** (`--tl-subject-N[-light|-dark]-label`), since lightness now varies by subject and one label colour can't fit all. They replace the single `--tl-subject-label`, which no component used yet. The vivid labels come from the same ink/paper pair, a slight shift from T-01's 0.22 / 0.97.
- **Only base colours are gated for colour-blind distance.** The ±0.07 child steps are told apart within a lane by position and label.
- **Palette switch: attribute only.** `data-palette="vivid"` on `<html>` (or any ancestor) opts in; no attribute means safe. `src/lib/timelinePalette.ts` sets or clears it. **The real toggle lands with a later settings/timeline ticket.**
- **Semi-transparency unchanged.** Tailwind maps every token to `var(--tl-*)`, so `bg-subject-1/50` still compiles to `color-mix(… 50%, transparent)` for whichever palette is active. A test covers this.

### Pastel direction (This Week)

DeeDee wants This Week minimal, with pastel colours. Each subject therefore also gets `--tl-subject-N-pastel` (Tailwind `bg-subject-N-pastel`): the same hue as the subject's palette colour, so a subject's colour matches across pages. It sits at L 0.95 (light) or 0.32 (dark), with chroma ≤ 0.035, and follows the active palette. Text on a pastel uses `--tl-foreground` / `--tl-muted-foreground`, both above WCAG AA (tested). **The This Week screens are not restyled yet; that is its own ticket.**

## T-02 — view model decisions

- **A shared assignment shows in each child's sub-lane.** The plan API returns one plan per assignment × child, and each child really does that work, so History appears in Frank's and Margaret's sub-lanes. The prototype's extra "Both kids" sub-lane is not built.
- **Roster subject colours are not used on the timeline.** Lanes take palette slots 1–10 in roster order (active subjects first, then sort order, then name), so the colour-blind-safe set stays intact. Archived subjects that still have plans come after active ones. An 11th subject reuses slot 1; the lane name is the backup cue. Mapping a subject's own swatch onto a slot is left as a product question.
- **Child steps follow roster order**: first child base, second light, third dark, and a fourth child cycles back to base. A child keeps the same step in every subject. Sub-lane position and the child's name tell repeated steps apart.
- **Weekly smoothing is the engine's**, per assignment: each week's thickness is spread evenly over that week's counted days, so stacks still add up. Callers fetch whole weeks (`weekAlignedRange`) so no average covers part of a week.
- **Event days are only marked on school days that no family-wide break covers**, since an event takes nothing from the plan on a day off. Archived events, and events with no day in range, are left out.
- **Breaks keep their children.** A family-wide break (`childIds: []`) will shade every lane; a per-child one only that child's sub-lanes (T-03/T-04).
- **Thickness, never minutes.** The model carries the engine's thickness points; a test checks that no "minute" key appears.
- **Unknown ids don't crash the view.** A plan whose subject, child or assignment is missing from the lists gets "Subject", "Child" or "Assignment" and sorts last.
