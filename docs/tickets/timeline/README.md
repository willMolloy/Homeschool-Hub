# Timeline tickets

From the Timeline Tools Page (stack, colour and typography choices for the year timeline). Same format as the other ticket folders.

| # | Ticket | Depends on | Size |
|---|---|---|---|
| T-01 | [Generate the timeline design tokens](T-01-generate-the-timeline-design-tokens.md) | — | S |
| T-01b | [Colour-blind-safe default palette](T-01b-colour-blind-safe-default-palette.md) | T-01 | S |
| T-02 | [Timeline view model](T-02-timeline-view-model.md) | T-01b | M |
| T-02b | [Hand-test fixes: contrast, no events in the demo, hidden adjust buttons](T-02b-hand-test-fixes.md) | T-02 | S |
| T-03 | [Layout function: no-overlap rows, full-width plot, bar opacity](T-03-layout-function.md) | T-02 | M |
| T-03b | [This Week: "Make an adjustment" and a calmer page](T-03b-this-week-adjustment.md) | T-03 | M |
| T-04 | [Static SVG timeline at Year zoom, reachable in the app](T-04-static-svg-timeline.md) | T-03 | M |
| T-05 | [Zoom presets Year / Fall / Spring with crossfade](T-05-zoom-presets.md) | T-04 | M |
| T-05b | [All subjects bar pinned above the lanes](T-05b-all-subjects-bar.md) | T-05 | S |
| T-05c | [Calm zoomed-out detail, and This month](T-05c-calm-detail-and-this-month.md) | T-05b | M |
| T-06 | [Names inside the bars](T-06-names-inside-bars.md) | T-05 | M |
| T-07 | [Adjust sheet](T-07-adjust-sheet.md) | T-04 | M |
| T-07c | [Child filter](T-07c-child-filter.md) | T-05b, T-07 | S |
| T-07d | [Richer demo seed](T-07d-demo-seed.md) | T-07c | S |
| T-07e | [Edit bar at the bottom](T-07e-edit-bar.md) | T-07, T-07d | M |
| T-07f | [This month shows only what is in the month](T-07f-month-rows.md) | T-05c, T-07d | S |
| T-08 | [Drag a bar to change its dates](T-08-drag-bars.md) | T-07e, T-07f | M |
| T-08b | [Polish after the drag hand-test](T-08b-polish.md) | T-08 | S |
| T-08c | [Bar opacity halfway to solid](T-08c-bar-opacity.md) | T-08b | S |
| T-09 | ["How did last week go?" redesign](T-09-last-week-redesign.md) | T-03b, T-08c | M |
| T-10 | [Add assignment from the timeline](T-10-add-assignment.md) | T-08c, T-09 | M |
| T-10b | [A label past a bar stops at the next bar](T-10b-outside-label-overlap.md) | T-10 | S |
| T-11 | [Gaps between bars, connectors across breaks, a label in every piece](T-11-gaps-connectors-piece-labels.md) | T-10b | M |
| T-11b | [Name a later piece at 2× its name](T-11b-later-piece-label-2x.md) | T-11 | XS |
| T-11c | [Names straight on the bar](T-11c-names-on-the-bar.md) | T-11b | S |
| T-11d | [Names above thin bars](T-11d-names-above-thin-bars.md) | T-11c | S |
| T-07b | Manual zoom: pinch, ctrl+wheel and pan; the presets just jump *(written when started)* | T-05c, T-07 | M |

The order is the Tools Page's build order. The parent pilot gate was dropped by DeeDee (they will test the timeline themselves), so these no longer wait for pilot results. Each ticket doc is written when its work starts, in the same format. The tester's verification pass is run separately and is not in this list.

## Requirements recorded for later tickets

- **T-03 (layout).** DeeDee's hand-test rules:
  - **No overlap.** Two bars never overlap horizontally on the same row, even within one subject. When assignments overlap in time, they go on separate sub-rows within the lane. Each row keeps its own fixed centerline, and spacing comes from each row's thickest point plus the same gap. Rows are assigned by greedy interval packing, ordered by start date, then id, so the result is stable.
  - **Horizontal room.** The timeline gets as much width as is reasonable. Lane labels are compact (a narrow gutter, or labels inside or above the lane), not a wide column. Side padding is minimal, the timeline runs full-bleed on phones, and nothing sits beside it. Tap targets stay at 44 px or more.
  - **Bar opacity.** Bar opacity lives in one token (`--tl-bar-opacity`), about 15–20 points lower than before. Colour-blind minimums and label contrast are re-checked at that opacity, and before/after screenshots go in `docs/progress/screens/`.
- **T-07 (adjust sheet).** "End one week earlier", "End one week later" and "Reset" appear only once an assignment or activity is selected. They are hidden, not disabled, and a test covers it.
- **"Make an adjustment" on This Week** (written as its own ticket after T-03):
  - Each student gets a clearly visible button. It opens a shadcn Drawer on phones and a Dialog on wider screens.
  - The parent picks an activity or assignment and changes it with the same controls as the last-week card, reusing that component.
  - Simple and pastel (`--tl-subject-N-pastel`).

## Design principles (every ticket from T-02b on)

- The app is very simple and visually calm, never overwhelming.
- Show only what's essential. Controls appear only when they're relevant: progressive disclosure, with sensible defaults.
- No extra helper text, badges or borders.
- Every ticket has an acceptance criterion that checks for anything shown that isn't essential.

Decisions and the palette report: [docs/progress/timeline.md](../../progress/timeline.md).
