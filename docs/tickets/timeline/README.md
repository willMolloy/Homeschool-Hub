# Timeline tickets

From the Timeline Tools Page (stack, colour and typography choices for the year timeline). Same format as the other ticket folders.

| # | Ticket | Depends on | Size |
|---|---|---|---|
| T-01 | [Generate the timeline design tokens](T-01-generate-the-timeline-design-tokens.md) | — | S |
| T-01b | [Colour-blind-safe default palette](T-01b-colour-blind-safe-default-palette.md) | T-01 | S |
| T-02 | [Timeline view model](T-02-timeline-view-model.md) | T-01b | M |
| T-03 | Layout function *(written when started)* | T-02 | M |
| T-04 | Static SVG timeline at Year zoom, reachable in the app *(written when started)* | T-03 | M |
| T-05 | Zoom presets Year / Fall / Spring with crossfade *(written when started)* | T-04 | M |
| T-06 | Names inside the bars *(written when started)* | T-05 | M |
| T-07 | Adjust sheet: Drawer with steppers *(written when started)* | T-04 | M |
| T-08 | Drag to resize *(written when started)* | T-07 | M |
| T-09 | Drag to move *(written when started)* | T-08 | M |

The order is the Tools Page's build order. The parent pilot gate was dropped by DeeDee (they will test the timeline themselves), so these no longer wait for pilot results. Each ticket doc is written when its work starts, in the same format. The tester's verification pass is run separately and is not in this list.

Decisions and the palette report: [docs/progress/timeline.md](../../progress/timeline.md).
