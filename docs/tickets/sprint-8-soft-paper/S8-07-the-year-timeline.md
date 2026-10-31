# S8-07 — The Year timeline in Soft Paper

**Source:** `design/ux-research.md` §4 Soft Paper "Bars" and §5 "Year"  
**Depends on:** S8-03  
**Size:** M

## Goal
The Year timeline uses the Soft Paper look in both themes without changing how it works.

## Steps
1. Bars use the subject fills (S8-01) with rounded ends and a 1 px strong outline at 40% opacity; the All subjects strip uses ink at low opacity.
2. Today is a dotted fern line, not red; axis labels in Nunito Sans secondary; lane names in ink.
3. The edit bar becomes a bottom sheet in the Soft Paper style (Start, End, Copy, More), keeping S6b-05's behaviour. Dragging stays off (S7-20); no drag handles.
4. **Tighter lanes (Will):** put each subject's name inline at the start of its first bar row (or in a narrow left label) instead of on its own line, so lanes sit about as close as the bars within them; names stay readable and never collide with bars.
5. **Calm bars and no dragging** from S7-20/S7-21 carry over.
6. Dark mode: the dark fills and strong tones; check outside names and the soft cap still read.

## Done when
- The timeline matches the direction in both themes; drag, zoom, the edit bar and custom views behave as before.

## Tests
- Existing timeline tests pass; contrast for labels on fills in both themes; before/after screenshots.

## Out of scope
- New timeline features.
