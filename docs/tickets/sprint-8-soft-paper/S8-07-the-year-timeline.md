# S8-07 — The Year timeline in Soft Paper

**Source:** `design/ux-research.md` §4 Soft Paper "Bars" and §5 "Year"  
**Depends on:** S8-03, S8-11  
**Size:** M

## Goal
The Year timeline uses the Soft Paper look in both themes without changing how it works.

## Steps
1. Bars use the subject fills (S8-01) with rounded ends and a 1 px strong outline at 40% opacity; the All subjects strip uses ink at low opacity.
2. Today is a dotted fern line, not red; axis labels in Nunito Sans secondary; lane names in ink.
3. The edit bar becomes a bottom sheet in the Soft Paper style (Start, End, Copy, More), keeping S6b-05's behaviour. Dragging stays off (S7-20); no drag handles.
4. **Subject badges, tighter lanes (Will, 2026-10-31):** a narrow left gutter (about 24 px) holds one round badge per lane: the subject's icon (S8-11) on its pastel fill with a strong-colour ring. No subject names on the timeline and no separate name rows, so lanes sit about as close as the bars within them; bars carry only assignment names, truncated with "…" to fit. Tapping a badge shows the subject's name in a small popover and highlights that lane; the badge has the subject name as its accessible name. The All subjects strip gets a small chart icon in the gutter. Mockup: `design/mockups/soft-paper-year-badges.png`.
5. **Calm bars and no dragging** from S7-20/S7-21 carry over.
6. Dark mode: the dark fills and strong tones; check outside names and the soft cap still read.

## Done when
- The timeline matches the direction in both themes; drag, zoom, the edit bar and custom views behave as before.

## Tests
- Existing timeline tests pass; contrast for labels on fills in both themes; before/after screenshots.

## Out of scope
- New timeline features.
