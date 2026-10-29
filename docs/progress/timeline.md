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
| T-04 Static SVG timeline at Year zoom | ed51f34 | `/timeline` route and a Timeline nav item; `Timeline.tsx` draws the T-03 layout (hatched breaks, month lines, labels above lanes, one path per band, Total strip, event strips, Today line and pill); Aug 1 – Jun 30 school year trimmed to planned weeks; screen-reader lane list; +5.6 KB gzip |
| T-05 Zoom presets Year / Fall / Spring | db0db98 | Text toggle buttons beside the title; 200 ms opacity crossfade (old zoom on top, aria-hidden), instant with reduced motion; Today at its date in every zoom; no control when the grid doesn't cross New Year |
| T-06 Names inside the bars | aa34054 | Name inside each bar where it fits, pinned left, cut with "…" (at least 4 characters) or left out; solid patch of the bar's swatch with its AA label colour; canvas `measureText` (cached) injected into the layout; fades with the zoom |
| T-05b All subjects bar | 8891fb4 | DeeDee's request: the summed load of every lane as one grey bar pinned above the lanes, labelled "All subjects", 32 px at the family's heaviest point on one scale for every zoom; `--tl-total` token at the bar opacity |
| T-05c Calm detail and This month | 7ecc308 | DeeDee's request, replacing the earlier "Year/Fall/Spring only" decision: presets Year / Fall / Spring / This month (‹ › flip months); detail follows the visible span (`DETAIL_SPAN_WEEKS` = 8, 1-week hysteresis): daily steps and events at 8 weeks or less, smooth monotone curves over a 3-week moving average above, with quiet breaks and fewer phone month labels; All subjects bar follows the same rule |
| T-07 Adjust sheet | 21158b1 | Tap a bar (44 px targets via `hitTest`) to select it: the other bars and names dim, and a sheet (Drawer on phones, Dialog ≥ 640 px) shows the title, subject · child, dates and "End one week earlier" / "End one week later" / "Reset". Those buttons don't exist in the DOM until something is selected (DeeDee's T-02b rule, tested). `PATCH /api/assignments/:id { endDate }`, then the plan is refetched. Keyboard path through the lanes list. Screens: `t07-sheet-390.png`, `t07-sheet-changed-390.png`, `t07-sheet-1280.png` |
| T-07c Child filter | b24ba30 | DeeDee's request: one row of chips under the title (All, then each child with something planned), hidden with one child; one child's view keeps only their sub-lanes, breaks and events, and recomputes the All subjects bar for that child at 32 px over that view's peak; palette slots don't move; choice kept in `?child=<id>` (replace), unknown ids fall back to All |
| T-07d Richer demo seed | 4bb9262 | DeeDee's request: the demo family is now `db/demo-family.ts`, a varied 2026–27 year (Treasure Island and Charlotte's Web in three weeks, back-to-back books, chapters beside pages, overlaps in one subject, lesson math all year, a January start, the science fair heavy for three weeks then lighter via week overrides, Labor Day, Thanksgiving week, Christmas, spring break, four events, one past check-in ahead and one behind); `seed()` takes the family to load, and tests keep the engine's sample family (`SAMPLE_FAMILY`) |
| T-07e Edit bar at the bottom | e998596 | DeeDee's request: the adjust sheet (a modal) is replaced by a slim edit bar fixed to the bottom of the viewport (above the tab bar on phones): move a week back or forward, Start and End date pickers, end a week earlier or later, Reset after a change, ×; the selected bar is kept above it; the API refuses date changes that would leave the latest check-in outside the assignment |
| T-07f This month shows only what is in the month | 9dad6cc | At This month, rows, lanes and subjects with nothing in the month are left out; rows are packed from the whole year first, so a bar keeps its row across zooms |
| T-08 Drag a bar | 7283bf4 | DeeDee's request: drag the body to move an assignment, an end to change its start or end; whole weeks zoomed out, school days at This month; live preview of that lane and All subjects with the dates in the edit bar; saved on release, Reset undoes it; touch drags only the selected bar so the page still scrolls |
| T-08b Polish after the drag hand-test | d9777f1 | DeeDee's hand-test: zoomed out, each assignment is a clean shape (one thickness, or distinct phases like the science fair's heavy-then-light) and All subjects has no edge wobble; the selected bar is fully opaque with a grip at each end; the Start and End fields follow a drag live |
| T-08c Bar opacity | 31e6a0b | DeeDee's request: unselected bars and All subjects from 0.82 to 0.91 (halfway to solid), bars dimmed by a selection from 0.3 to 0.65, the selected bar stays at 1; colour-blind and contrast checks re-run, no threshold changed |
| T-09 "How did last week go?" redesign | ea9ed8c | DeeDee's request: the default is that last week went as planned (the week, "Everything went as planned.", Looks right, a quiet Skip); one calm pastel row per planned assignment with a quiet check; tapping a row opens As planned / Less / More and a − / + stepper inline, and a changed row shows "2 of 3 ch." with Undo; a child picker with more than one child; Add progress on something else at the bottom; the per-student sheet uses the same rows and is titled "Last week · Oct 19–25"; same check-in API and engine |
| T-10 Add assignment from the timeline | ae916f3 | DeeDee's request: "+ Add assignment" in the timeline header opens the existing assignment form (a bottom sheet on phones, a right side panel wider); essentials first and the weight behind More (on the schedule screen too); the new bar appears at once, briefly highlighted, switching the child filter to All if it would hide it; titles required in client, API (400) and DB; bars too short for an inside name get a label past their end; the demo can add assignments, events stay blocked |
| T-10b A label past a bar stops at the next bar | (this commit) | Found on the T-10 preview at 390 px: a label past a short bar could run over the next bar's name when the two edges differed only by rounding. The limit is now the next start after the bar's own start; no visual change otherwise |

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

## T-05 — Zoom decisions

> **Replaced in part by T-05c, at DeeDee's request:** the presets are no longer "Year, Fall and Spring only". This month is added, and detail follows the visible span rather than the preset. See "T-05c — Calm detail decisions" below.

- **"Anchored":** every zoom fits the width, so there is no scroll to keep. Today is drawn at its own date in every zoom that shows it, and is absent in Spring while it's still fall. Zoom state lives on the page, so T-07's selection can sit beside it and survive zoom changes.
- **Starts at Year** on every visit. It isn't remembered and doesn't jump to the half holding today. That's conservative and easy to change after the hand-test.
- **Crossfade:** opacity only, 200 ms. The old picture sits on top and is `aria-hidden`. It's removed on `animationend` or by a timer, and is instant under reduced motion. Measured in the preview: 0.62 opacity at about 60 ms, then one layer left.
- **No control** when the planned weeks don't cross New Year (both halves would repeat Year).
- **Text buttons, not chips**, because chips have borders.
- Screenshots: `screens/t05-timeline-fall-390.png`, `screens/t05-timeline-fall-1280.png`.

## T-06 — Names decisions

- **Threshold is the fit rule**, applied at every zoom. A name shows wherever the bar is at least 13 px thick and long enough for 4 characters plus "…". At Fall and Spring, the daily bars break at non-school days, so only long unbroken runs get names.
- **Solid patch, full bar thickness, square corners.** At 0.82 opacity, 5 light-theme swatches miss AA for their label colour, so the name sits on its swatch at opacity 1. Filled to the bar's height, it reads as part of the bar rather than a badge.
- **Measuring:** the layout takes an injected `measureText`. The page passes a cached `OffscreenCanvas` measure in the page font. Tests and old browsers use an over-estimate, so names may be cut early but never overflow.
- **Accessibility:** names are `aria-hidden`. The full titles are already in the screen-reader lane list.
- Screenshots: `screens/t06-timeline-390.png`, `screens/t06-timeline-1280.png`, `screens/t06-timeline-fall-1280.png`.

## T-05b — All subjects bar decisions (DeeDee's request, after T-04)

- **Moved from the bottom to the top.** It sits under the axis and event strips, above every lane, on its own label row and centerline. "Pinned" means fixed at the top of the picture, not sticky on scroll. This is conservative and can be revisited.
- **Sum, then normalise.** The thickness at each point is the sum of every lane. One scale is used for every zoom, so the heaviest point (daily or weekly) is 32 px, about the thickness of a heavy single lane. The pixels aren't stacked.
- **Neutral grey `--tl-total`** at `--tl-bar-opacity`, replacing the T-04 muted strip at 0.35 opacity. Labelled "All subjects", with no legend or numbers.
- Screenshots: `screens/t05b-timeline-390.png`, `screens/t05b-timeline-1280.png`.

## T-05c — Calm detail decisions (DeeDee's request; replaces "Year/Fall/Spring only")

- **This replaces the earlier "Year, Fall and Spring only" zoom decision, at DeeDee's request.** The presets are Year, Fall, Spring and This month. This month opens on today's month, clamped to the grid, and ‹ › flip it. The 2:50 PM wording replaces the 2:45 PM "Month zoom".
- **Detail follows the visible span**, with one constant, `DETAIL_SPAN_WEEKS` = 8, and 1 week of hysteresis. At 8 weeks or less: daily steps, event strips, the hatch, and week lines with dates. Above it: smooth curves, no events, breaks as a 0.12 tint, and month lines only. The All subjects bar follows the same rule on its one scale.
- **Smoothing:** a centred 15-school-day (3-week) moving average per segment, so each assignment keeps its first and last day. Segments split at a week off. Thickness is rounded to even pixels and held through changes under 3 px, before the curve is drawn. The curve is monotone cubic through plateau centres, so it doesn't overshoot, and an end sliver narrower than 12 px joins its neighbour.
- **Phones:** month labels at least 48 px apart (every other month at Year). The four presets sit on one compact row.
- **Manual pinch, ctrl+wheel zoom and pan → its own ticket (T-07b) after T-07.** The presets and month flipping ship first.
- **A month flip doesn't fade.** Only preset changes crossfade.
- **Lanes move up once, at the threshold**, because the event rows aren't reserved when hidden. The crossfade covers it.
- Screenshots: `screens/t05c-timeline-390.png`, `t05c-month-390.png`, `t05c-timeline-1280.png`. Before/after at 390 px in `/workspace/hh-preview-shots` (`before-smooth-*`, `after-smooth-*`, `after-month-390.png`).

## T-07 — Adjust sheet decisions

- **Hidden, not disabled.** The three buttons live inside the sheet, and the sheet is only rendered while something is selected, so none of them is in the DOM before a tap (`timeline-adjust.test.tsx` checks by role and by text).
- **"End one week earlier" is left out, not disabled, when the new end would fall before the start**, the same rule applied one level down. "End one week later" is always offered; the API's 400 (for example the maximum span) shows as an alert in the sheet.
- **Reset appears only after a change in this visit** and restores the end the assignment had before its first change. Once the end is back, Reset goes away. It is not persisted across visits: the server keeps no "original" end, and inventing one is out of scope.
- **The sheet is modal** (the Base UI Drawer/Dialog from T-03b), so the zoom can't change while something is selected; the selection lives on the page beside the zoom and is cleared when the sheet closes. A tap on empty space selects nothing.
- **Dimming is opacity only** (`.tl-dim` at 0.3); no outline, border or highlight on the selected bar.
- **Shared assignments** list every child on the subtitle ("Reading · Ada, Ben"), because the end date is the assignment's, not one child's.
- **Saving:** the PATCH returns the saved assignment, which replaces the cached one at once (the sheet's dates update), and the plan is refetched so the bars redraw from the engine. While saving, the buttons are disabled; there is no confirmation step (Reset undoes).
- **Buttons are quiet pills** (`--tl-secondary` fill, no border) to match the zoom presets, instead of the app's outlined secondary buttons.
- **Keyboard:** every assignment in the screen-reader lanes list is a button that selects it; the list becomes visible while focus is inside it.
- **Deferred:** the minutes-per-day stepper and the thicken-or-push choice need engine decisions, and event strips (activities) are not selectable; their dates belong to the Events screen. Manual pinch, ctrl+wheel and pan is T-07b, not built.

## T-07c — Child filter decisions (DeeDee's request)

- **A filter of the model, not a new plan.** `forChild` keeps the chosen child's sub-lanes and recomputes the totals from them. The grid, today, palette slots and child colour steps stay the same, so a subject keeps its colour between views.
- **Breaks and events:** a view keeps whole-family ones and that child's own (for example, Margaret's violin is not drawn in Frank's view).
- **The chips are the active children with something on the timeline**, in display order. A child with nothing planned gets no chip, because their view would be empty. With fewer than two chips, the row isn't rendered.
- **`?child=` holds the child's id**, not their name, so renaming a child doesn't break a saved link. It is written with `replace`, so the chips don't fill the back button's history. An unknown or archived id shows All. All removes the parameter.
- **Placement:** its own row under the title and presets (on phones the presets already fill the row under the title), above ‹ month ›. It is styled like the presets: text pills with the pressed one filled, no border, and the row scrolls sideways if there are many children.
- **The selection** (T-07) uses the filtered model, so a bar that isn't shown can't stay selected.

## T-07d — Richer demo seed decisions (DeeDee's request)

- **A second dataset, not a changed fixture.** The engine fixture is what the engine and API tests compare numbers with (Treasure Island's 22.5 pages a day, the check-in examples), so it stays. `SAMPLE_FAMILY` wraps it, and the API test helper and the sample seed test pass it explicitly. This replaces S2b-33's "the demo family is the fixture": the API-equals-fixture comparison still runs, on the sample family.
- **`seed(url)` now loads the demo family**, so the preview, `npm run demo` and `npm run db:seed` all show the new year with no other change. It stays idempotent (delete by login, recreate in one transaction).
- **"Heavier for a few weeks, then lighter" uses week overrides** (`keepEndDate`, 6 lessons a week for the fair's first three weeks). The engine already plans overrides, and there is no other way to shape one assignment without inventing an engine rule.
- **Check-ins are real `progress_checkin` rows in past weeks** (Oct 5 and Oct 12, both marked reviewed), so the plan re-anchors the way it does after a parent's check-in. Read ahead uses push (The Hobbit ends early). Behind uses keep (The Secret Garden thickens to the same end). The week of Oct 19 is left unreviewed, so the Plan screen still asks how last week went.
- **Dates are fixed**, not relative to today. The demo is the 2026–27 year, and the check-ins only read as "past" from late October on. Moving them with the clock would make the seed differ day to day.
- **Names kept:** Frank, Margaret, Literature, Math and History stay, because the smoke scenarios click them. Art is added as a sixth subject for the mid-year start.
- **The read-only rule is untouched.** It is keyed on the demo login, and `demo-read-only.test.ts` still covers it. The new API test seeds the demo data under its own login, so it doesn't fight that test for demo@example.com.

## T-07e — Edit bar decisions (DeeDee's request)

- **Replaces the T-07 sheet.** DeeDee: "I don't think we want a modal if we click on an activity. Just have a couple of modifier fields appear at the bottom of the screen." It is a labelled region, not a dialog: no backdrop and no focus trap, so the page scrolls and zooms behind it. `AdjustSheet` is deleted; `ResponsiveSheet` stays for the check-in screen.
- **Start date PATCH already existed.** What was missing was a rule for check-ins. A move may not leave the **latest** check-in's week outside the assignment (409 `check_in_outside`): the start can't move past that week's last day, and the end can't move before its Monday. Earlier check-ins aren't checked, because the latest check-in is authoritative (D24, S2b-38) and the engine already ignores older ones.
- **Moves shift both dates by 7 calendar days**, sent as one PATCH. Only changed fields are sent.
- **Date fields save on a complete, valid change.** A start after the end is refused in the bar, before any request, with one inline line. Server errors use the same line.
- **Reset** puts back the dates from before the first change in this visit (both fields), and disappears once the dates match them again.
- **Layout:** on phones the order is moves, dates, then the end steps under the dates. From 640px the end steps sit beside the moves and the dates go under them.
- **Never covering the bar:** the page gets empty room as tall as the edit bar, and on a new selection the selected bar is scrolled up above it if needed. Editing doesn't scroll again.

## T-07f — This month rows decisions

- **"Nothing in the visible range" means nothing drawn** (the assignment's drawn extent, daily or weekly, doesn't overlap the month), so a lane whose only work is in another month goes.
- **Rows are not repacked.** Packing still uses the whole year, and empty rows are then dropped, so a bar never changes row when switching zoom (the T-03 rule).
- **Only This month.** Year, Fall and Spring keep every lane, as asked. The screen-reader lanes list still lists everything.
- **Labels keep the "Subject · Child" form** whenever the family has more than one child, even if only one child's lane is left in a subject that month, so the label doesn't change between months.

## T-08 — Drag decisions (DeeDee's request)

- **Phones: selected-first, not long-press.** A tap selects (T-07e), then a sideways drag on the selected bar moves it. Long-press fights the browser's own long-press, and selected-first needs no timer. Before anything is selected, touches on the picture are the browser's as before.
- **`touch-action: pan-y pinch-zoom` only while something is selected**, so vertical scrolling and pinch-zoom always work. If the browser takes a gesture for scrolling, the drag is cancelled and nothing is saved.
- **Handles are 44 px zones centred on each end**, not drawn. On a bar shorter than three half-handles (66 px), the inside is body and only just outside each end resizes, so a short bar can still be moved.
- **Snapping:** Year, Fall and Spring move by whole calendar weeks (one school week's width per step). This month moves each date by school days, skipping weekends. The edges never cross: start stops at the end and the end at the start.
- **The preview is approximate on purpose.** It spreads the assignment's current planned values over the school days of the new dates (breaks for that child left out), keeping the total. The real plan comes back from the server after the save and replaces it. Re-running the engine in the browser would duplicate the server's rules.
- **Rows may repack in the preview** when the dragged bar starts overlapping a neighbour; that is the T-03 no-overlap rule, applied live.
- **Saving goes through the T-07e save**, so a drag sends only the changed fields, the check-in guard applies, server errors show in the edit bar, and Reset undoes it.

## T-08b — Polish decisions (DeeDee's hand-test of T-08)

- **Clean shapes, zoomed out only.** An assignment's school days are cut into school weeks; consecutive weeks within ×1.5 of each other form a phase, a phase under 10 school days joins its closer neighbour, and alike neighbours join. Every day of a phase gets the phase's average, so most assignments are one thickness. The existing monotone curves give the gentle step between distinct phases (the science fair). This month (≤ 8 weeks) is unchanged.
- **All subjects** is the moving average of the sum of the clean shapes, so it has no edge wobble of its own making.
- **Breaks:** a week or more off splits a bar, as before. A single day off inside an assignment (Labor Day) is bridged, as before. Splitting there would cut a sliver off the start of every September bar and hide its name.
- **Selected bar:** fill-opacity 1; the others stay dimmed.
- **Grips:** a small rounded pill (4 px wide) inside each end of the selected bar, in the bar's label colour, drawn on the selected bar only. They don't catch the pointer.
- **Touch targets:** the selected bar is hit-tested first. On a bar narrower than 66 px, each end reaches 44 px outside the bar, so both ends are at least 44 px wide on touch.
- **Cursors:** ew-resize over the ends and move over the body (was grab).
- **Live date fields:** Start and End are controlled inputs that follow the selection, including the drag preview. A body drag changes both; an end drag changes that one. Typing keeps a draft until the selection's dates change.

## T-08c — Bar opacity decisions (DeeDee's request)

- **0.82 → 0.91** for `--tl-bar-opacity` (`BAR_OPACITY` in `scripts/palette.ts`; `tokens.css` regenerated with `npm run tokens`). It also applies to the All subjects bar, which shares the token.
- **Dimmed 0.3 → 0.65.** This is the element opacity on top of the bar opacity, so a dimmed bar draws at about 0.59 (it was about 0.25).
- **Selected stays at fill-opacity 1.**
- **Checks re-run, no threshold changed.** The T-03 test pinned 15–20 points below opaque; it now pins 0.91, halfway from 0.82 to 1. That is the requirement itself, not a colour threshold. Being closer to opaque, the as-drawn colour-blind distances went up (smallest now 0.076, tritanopia light, against the 0.065 floor). Names still sit on their solid patch, so label contrast is unchanged and passes.

## T-09 — "How did last week go?" redesign decisions (DeeDee's request)

- **One row component, two hosts.** `CheckInRow` is used by the This Week card and the per-student "Make an adjustment" sheet. `ProgressAdjuster` (chips, slider, number field), `AbsorbChoice` and the apply-to-all groups are removed, with their pure helpers (`progress.ts`, `outcomeText`, `CHOICES`, `plannedCountText`, `plannedRangeText`, `reviewStatusText`) and tests. The pastel tint moved to `usePastels.ts` so both hosts share it.
- **No absorb question.** New differences save with `DEFAULT_MODE` (keepEndDate, which was already preselected), rows reopened in the sheet keep their stored mode, and a row that reaches the total sends `mode: null`, as before. The API, the "latest check-in is authoritative" rule and the engine are unchanged. Choosing "push the end date" is no longer offered in this UI.
- **Amounts, not positions.** The row speaks in what was done this week (`done = position − plannedFrom`): "2 of 3 ch.", "Missed" at 0, "+2 lessons" on an added row. The stepper moves 1 unit (5 for minutes), lands on whole steps, and stays between the week's start and the total. Less and More start one step off the plan, past the API's 0.5 tolerance. More is disabled at the total, and Less when under half a unit was planned. A big change in pages takes several taps (one per page); that is accepted for now, because a single stepper is what was asked for.
- **"Missed".** It is not a fourth choice. Less stepped down to 0 reads "Missed".
- **The primary button.** It says "Looks right" while nothing has changed (it confirms with no items, as before) and becomes "Save" once a row changes. The summary then reads "1 change from the plan." The button and summary sit above the list so the default needs one tap; Add progress is at the bottom.
- **Child picker.** It shows only with more than one child, and filters the rows and Add progress options. Changes on every child are kept and saved together.
- **Sheet title.** "Frank · Last week · Oct 19–25" keeps the student's name, because the sheet is per student. An older shown week stays "Frank · Oct 12–18".
- **Kept as before.** The brief thanks (about 3 s) then back to This Week, inline 400 errors on their row, hidden when reviewed, skipped or empty, and edit-mode Save replacing the whole week (Undo on a stored row removes it). "Skipping counts as done" (a tooltip) was dropped as helper text.
- **Layout.** The card is centred with a max width of 560px. Rows, Undo, the choice, the stepper, Skip, the picker and Add progress are all at least 44px. The buttons keep the app's own `.btn` style, so the card matches the rest of the app. Pastel comes from the subject tints.
- **Docs.** The stale placeholder rows "T-08 Drag to resize" and "T-09 Drag to move" were removed from the ticket README (T-08 delivered both). The id T-09 now names this ticket, and the doc sits with the timeline tickets.

## T-10 — Add assignment decisions (DeeDee's request)

- **Reuse, not rebuild.** `AssignmentForm` is exported from the schedule screen and dropped into `ResponsiveSheet` (T-03b). The sheet gained `wide="side"`: on screens ≥ 640px it is a full-height panel on the right instead of a centred dialog; phones keep the bottom Drawer. Base UI handles Escape, focus and the backdrop. `makeLookups` was split out of `WithLookups` so the timeline can build the form's lookups from data it already fetches (no extra requests).
- **One form, one order.** The reorder (Subject, Title, Children, Start/End, Unit/Total) and the "More" disclosure for the weight also apply on Schedule → Assignments, since it's the same component. More opens by itself when the weight has an error, so an error is never hidden. The weight's suggestion (S2b-11) still loads in the background before Add is enabled.
- **The button.** A quiet text button in the brand colour, straight after "Timeline" (zoom presets stay on the right; on phones it sits right-aligned, the zoom row below). It shows whenever the page has loaded, including "Nothing planned yet.", not while loading or failed.
- **After save.** The new assignment is added to the list, the plan refetched, and its bar and name get `tl-flash` for 2.4 s (an opacity pulse twice; none with reduced motion). Any selection is cleared so nothing is dimmed. If a child filter is on and the new assignment doesn't include that child, the filter goes to All. At This month, if the shown month doesn't overlap the new dates, it moves to the start month (clamped to the grid); other zooms already show the whole range.
- **Child not prefilled from the filter.** Conservative: the form behaves exactly as on the schedule screen (prefilled only when there's one child); the filter switch covers the hidden case.
- **Titles: no migration needed.** The API's `Title` schema has trimmed and required at least one character since S2a-03, before assignments existed (S2a-04), and `001_init.sql` has `title text NOT NULL CHECK (length(btrim(title)) > 0)`. So no stored row can be empty; this ticket adds tests (empty, tabs/newlines/nbsp-only, missing on POST; blank and empty on PATCH) rather than a backfill. The client already refused a blank title.
- **Every bar names itself where it can.** In-bar names (T-06) are unchanged. A bar with no inside name now gets a plain label in the page's ink just past its end, fitted (with "…") into the room up to the next bar in its row or the plot's edge, and only in rows at least 13 px tall so the text stays in its own row. Thinner rows still go without a drawn name; their titles are in the lane list for screen readers and in full in the edit bar when selected. Labels are aria-hidden and don't catch the pointer, as before.
- **Demo.** Only events were ever blocked for the demo, so it could already add assignments; now there's a test saying so, with events still 403.
- **No thresholds changed.**

## T-10b — Label overlap decisions

- **Compare starts, not end vs start.** Bars in a packed row never overlap, so the next bar is the next start. This avoids an epsilon and any rounding of pixel positions.
- **When there is no room, no label.** At 390 px Treasure Island ends right where The Hobbit starts, so it gets no label there. Its full title is still in the edit bar and in the screen-reader lane list, as with thin rows in T-10.
- **No thresholds changed.**
