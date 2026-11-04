# S11b-03 — Small fixes
**Findings:** N3, N4, N5, N6 (Low) · **Size:** S
## Steps
1. **N3:** the colour dot beside a saved child on step 2 is round (the `flex: 1` applies to the name, not the dot).
2. **N4:** Skip on the subjects step leaves no "Add subjects" reminder (Skip means "we don't need this"; only "later"-style choices leave reminders).
3. **N5:** at 360 px the hint bubbles sit beside or below their target, never covering it (flip above/below to stay on screen).
4. **N6:** every setup step, including steps 1 and 2, has a quiet "Sign out" (in the header), and Finish later stays from step 3 on.
## Done when
- Each item is fixed with a test, at 320, 360 and 1280 px in light and dark.
