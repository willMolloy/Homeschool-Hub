# S8b-02 — Year badges are easy to tap and show the whole name

**Finding:** S8 tester N2 (High) and N8 (Low): the badge popover is 20 px wide ("Li", "Sc"); small badges (20–23 px tall) miss about 1 tap in 3.  
**Depends on:** none  
**Size:** S

## Goal
Tapping a badge always hits it and shows the full subject name.

## Steps
1. The popover sizes to its text (max-content, up to the screen width minus 32 px) and stays on screen.
2. Keep the 24 px gutter, but give each badge a tap area at least 32 px tall (invisible padding, never overlapping a neighbour's lane).

## Done when
- At 320, 360 and 1280 px the popover shows "Literature" and "Science" in full; tap-targets reports every badge at least 32 px tall.

## Tests
- Web: popover width not fixed; badge hit area height ≥ 32.

## Out of scope
- A wider gutter.
