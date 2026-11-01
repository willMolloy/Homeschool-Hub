# S8b-07 — Small fixes from the Sprint 8 tester

**Finding:** S8 tester N7, N9–N14 (Low).  
**Depends on:** none  
**Size:** S

## Steps
1. N7: each Week bar's accessible name starts with its visible text.
2. N9: Home says "Nothing planned" (not "All done") for a child with nothing this week.
3. N10: after "Not quite", show one line saying what to do ("Untick what didn't get done, or tap a bar to update it").
4. N11: style the leftover native controls on set-up forms (radios in dark, clipped date and select text, the "Usual days" border); replace the word "effort" with the parent's words.
5. N12: `/timeline?view=x` keeps Year; the old `/schedule` hub link goes to Home.
6. N13: style the heavy-week line and drop the repeated child name.
7. N14: Year uses the shared child switch instead of its own chips, and the shared switch changes everywhere (Will, 2026-11-01):
   - The "Both" option is renamed **"All children"** (shown only when the family has 2+ children; it comes first).
   - When "All children" plus every child's name fits on one line at the current width, show them as chips.
   - When they don't fit (a big family, or a narrow phone), show one pill with the current choice ("All children ▾" or "Frank ▾") that opens a sheet listing All children and every child. No sideways-scrolling chip row, so no child is hidden off screen.

## Done when
- Each item is fixed and has a test.
