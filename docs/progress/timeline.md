# Timeline progress

Tickets: `docs/tickets/timeline/`. Source: the Timeline Tools Page. DeeDee dropped the parent pilot gate (they will test the timeline themselves), so T-02 onward are built in the Page's order.

| Ticket | Commit | Notes |
|--------|--------|-------|
| T-01 Generate the timeline design tokens | 9df15da | `scripts/palette.ts` → `src/styles/tokens.css` + `tokens.theme.css`; Tailwind v4 without Preflight; shadcn/ui `base-nova` config + `cn()`; no components yet |
| T-01b Colour-blind-safe default palette | a58731e | Okabe–Ito-based "safe" palette is the default; T-01 hues kept as `data-palette="vivid"`; per-swatch label tokens; `--tl-subject-N-pastel` tints; `src/lib/timelinePalette.ts` helper (no UI) |
| T-02 Timeline view model | 13209a6 | `features/timeline/{grid,marks,model}.ts`: subject lanes → child sub-lanes, daily + weekly-smoothed thickness per assignment on one daily grid, breaks, event days, Today, totals. Pure; nothing renders yet |
| T-02b Hand-test fixes | 2282106 | App declared light-only and native fields given explicit colours, with a CSS contrast test. The demo family can't add events (button hidden, `POST /api/events` → 403). The hide-until-selected rule for the adjust buttons is recorded for T-07 |
| T-03 Layout function | a0a1a77 | `features/timeline/{zoom,xscale,paths,rows,layout,hit}.ts`: no-overlap rows, labels above lanes (no label column), 44 px tap targets, shared scale 2.8 px/pt, `--tl-bar-opacity: 0.82`. Pure; nothing renders yet |
| T-03b This Week: "Make an adjustment" | a8a43a0, f04a4f5 | A "Make an adjustment" button per active child opens a Drawer (phones) or Dialog (≥ 640 px) with that child's check-in rows on subject pastels; collapsed rows; one week switcher replaces Prev/Next and "Review a past week"; debug items and the engine footer only in a dev build with `?debug=1`; borders replaced by spacing; quiet Skip |
| T-04 Static SVG timeline at Year zoom | (this commit) | `/timeline` route and a Timeline nav item; `Timeline.tsx` draws the T-03 layout (hatched breaks, month lines, labels above lanes, one path per band, Total strip, event strips, Today line and pill); Aug 1 – Jun 30 school year trimmed to planned weeks; screen-reader lane list; +5.6 KB gzip |

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

## Spec notes: design principles (DeeDee, 2026-10-28; every ticket from T-02b on)

- The app is very simple and visually calm, never overwhelming.
- Show only what's essential. Controls appear only when they're relevant: progressive disclosure, with sensible defaults.
- No extra helper text, badges or borders.
- Every ticket has an acceptance criterion that checks for anything shown that isn't essential.

### Spec notes: layout rules for T-03 (DeeDee's hand test)

- **No overlap.**
  - Two bars never overlap horizontally on one row, even within one subject.
  - Assignments that overlap in time go on separate sub-rows in the lane.
  - Each row has its own fixed centerline, and spacing comes from each row's thickest point plus the same gap.
  - Rows come from greedy interval packing, by start date, then id.
- **Horizontal room.**
  - Compact lane labels, minimal side padding, full-bleed on phones, nothing beside the timeline.
  - Tap targets stay at 44 px or more.
- **Bar opacity.** One token, `--tl-bar-opacity`, about 15–20 points lower than before. Colour-blind minimums and label contrast are re-checked at it.

## T-02b — hand-test fixes

- **Contrast: likely cause.** The rendered scan found no failing text in the app. It covered every signed-in screen with the demo login, at 390 and 1280 px, in light and dark `prefers-color-scheme` and in Chrome's forced-dark mode. The only cause the scan and the code point to is native fields and buttons, which a dark OS or browser theme can draw dark gray under our fixed dark text. Declaring the app light-only and giving fields explicit colours closes that path. If DeeDee saw it in the prototype on the Page (its controls come from the Page host), that needs a Page edit, which is outside this repo.
- **The demo is found by its login email**, the only marker it has. The address now lives once, in `apps/api/src/auth/demo.ts`, and the seed imports it.
- **Only adding events is blocked**, as asked. The demo can still edit or archive the seeded events. The check runs before the body is validated, so the demo gets the same 403 for any body.
- **The adjust buttons are prototype-only.** "End one week earlier/later" and "Reset" don't exist in the app yet. The hide-until-selected rule is written into the T-07 requirements.
- **Existing screens are flagged, not redesigned.** Things on the This Week screen that may break the design principles are listed in the T-02b report.


## T-03 — layout decisions

- **No-overlap rows.**
  - A child's assignments are packed greedily, by first drawn day, then assignment id, into the first row that is free. "Free" means the row's last bar ended before this one starts, so touching bars share a row.
  - The extent covers the daily and the weekly-smoothed series, so a row is the same at every zoom.
  - In the sample family this turns 10 sub-lanes into more rows (Literature, Math and Science each have overlapping assignments).
  - The prototype's in-lane stacking, and its 1 px gap between stacked bars, is gone: a row now holds one bar at a time.
- **Row spacing:** each row is as tall as its own thickest point, at any zoom, with a 2 px floor. Rows sit 4 px apart, with 8 px more before each subject. Centerlines never move between zooms.
- **Horizontal room.**
  - The 58 px / 132 px label column is gone. Each child's rows get one 16 px label line above them, at the plot's left edge.
  - The label is the subject name on a subject's first child, plus " · child" only when the family has more than one child; later children show just their name.
  - The plot is the full width less 4 px a side: 352 of 360 px (was 294) and 1272 of 1280 px (was 1140).
  - Full-bleed on phones and "nothing beside it" are renderer rules, so T-04 carries them.
  - Trade-off: about 16 px more height per child sub-lane, in exchange for 20% more width on a phone.
- **Tap targets:** `hit.ts` gives every bar run a box at least 44 × 44 px about its centre. When boxes meet, the nearer centerline wins, then the nearer edge. In dense areas a bar's own 44 px zone is shared with its neighbours, split between them, so a tap always resolves to exactly one bar. Labels aren't interactive.
- **Scale:** `PX_PER_THICKNESS` changed from 2 to 2.8 (the product owner's call, matching the prototype's "Exaggerated" feel). It is one constant in `features/plan/scale.ts`, shared with the thickness picker.
  - The picker's 20-pages reference bar is now 56 px (was 40).
  - Its 100 px cap is now reached at thickness 35.7 (was 50).
- **Bar opacity:**
  - **Before: 1.0.** The prototype's bars are opaque, and the repo had no value. **After: 0.82**, one token `--tl-bar-opacity` on `:root` (18 points lower, approved by the product owner).
  - Re-checked as drawn (composited in sRGB over `--tl-background` and `--tl-card`):

    | Vision | Safe, light | Safe, dark | Okabe–Ito, opaque → 0.82 (light) |
    |---|---|---|---|
    | Normal | 0.156 → 0.134 | 0.156 → 0.134 | 0.156 → 0.134 |
    | Deuteranopia | 0.094 → 0.075 | 0.094 → 0.079 | 0.098 → 0.078 |
    | Protanopia | 0.088 → 0.071 | 0.088 → 0.075 | 0.086 → 0.069 |
    | Tritanopia | 0.086 → 0.068 | 0.086 → 0.072 | 0.096 → 0.076 |

  - **Flag:** at 0.82 the as-drawn minimum (0.068) is under T-01b's 0.08 floor for opaque colours. Any opacity below about 0.95 does this, because transparency pulls every colour toward the background. Okabe–Ito itself drops to 0.069.
  - So the as-drawn gate is a separate floor, `CVD_MIN_DISTANCE_AT_BAR_OPACITY = 0.065`, and the opaque 0.08 gate is unchanged. Lanes are also told apart by position and their label, so colour is never the only cue.
  - **Label contrast:** on the translucent bar alone, some safe swatches can't reach 4.5:1 with either label colour. The worst are subject 8 light, at 4.25–4.34:1 on light, and subject 2 dark, at 4.45:1 on dark. So T-06 draws in-bar names on a solid, opacity 1 patch of the bar's own swatch, where every label meets AA (tested).
- **Screenshots** (sample family, Fall zoom, rendered from this layout's output with the real tokens):
  - before: `screens/t-03-bar-opacity-before-360.png`, `-before-1280.png`
  - after: `screens/t-03-bar-opacity-after-360.png`, `-after-1280.png`


## T-03b — This Week decisions

- **Which week the sheet edits:** the shown week when it's finished, otherwise last week. The API takes check-ins only for finished weeks.
- **Saving merges.** A PUT replaces the whole week, so the sheet sends the child's rows plus every other child's stored rows, unchanged.
- **Debug items** need a dev build plus `?debug=1`. These are the heading and note, "Plan as of", the today line, weight markers and legend, warning codes, the plan's engine note and the app footer's engine version. A production build never shows them. The engine-mismatch banner stays, because it asks a parent to reload.
- **A child with nothing planned** still gets the button, so a parent can record what was done anyway.
- **Borders:** check-in rows, plan table rows and the table's outer border use spacing instead.
- **Cards stay in step:** a save from the sheet refreshes last week's prompt on the page, through `checkInsVersion`.
- **Not changed:** the page name ("Plan"), and edit-mode Save being enabled before any change (S2b-27).
- **Removed:** `PastWeekReview` and `PastWeekPicker`. The switcher plus the sheet cover their job, and their tests were ported to `this-week.test.tsx`.

## T-04 — Year timeline decisions

- **Year range.** There is no school-year setting, so the year is Aug 1 – Jun 30 around today, with July counting as the coming year. The plan is fetched for those whole weeks (≈ 343 days, under the 400-day cap), then the view is trimmed to the planned weeks plus today. Empty summer weeks therefore take no width, and ends pushed later by check-ins still show. Work outside Aug–Jun is clipped.
- **Labels are SVG text above each lane**, not a sticky HTML overlay. Year zoom fits the width without scrolling. The totals strip gets its own "Total" label row (`totals.labelY` in the layout), because an unlabelled grey band was unclear.
- **Events** are drawn as the layout's 6 px strips, with no visible name. The name shows on hover and in the screen-reader list. The demo's seeded events show there. This is worth a look in DeeDee's hand-test: at Year zoom they read as dashes.
- **Width:** full-bleed on phones. On wider screens it uses the shell's 960 px column (912 px plot at 1280), rather than widening the shell for every page.
- **Bundle:** +5.3 KB JS and +0.3 KB CSS gzip (139.26 vs 133.95 KB JS), so the route is not lazy-loaded.
- **Accessibility:** one labelled image, plus a visually hidden list of every lane's assignments with dates. Lanes become focusable groups when selection arrives (T-07).
- Screenshots: `screens/t04-timeline-390.png`, `screens/t04-timeline-1280.png`.
