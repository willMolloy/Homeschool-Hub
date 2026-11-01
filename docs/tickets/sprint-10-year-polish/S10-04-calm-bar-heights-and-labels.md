# S10-04 — Calm bar heights and labels
**Source:** mockup "The cap"; notes "Labels" · **Size:** M
## Goal
Bar height follows `h = hMin + (hCap − hMin) × (1 − e^(−1.2·L))`, where L is the day's load relative to that child's typical day, smoothed 3 weeks at Year, 1 week at a term, none at month.
## Steps
1. Constants in one place: phone 12 → 20 px, desktop 14 → 22 px; extra rows 80 %; the child ribbon uses factor 0.45 (4 → 12 / 5 → 14 px). Height never jumps in steps.
2. Labels: inside if they fit; else outside to the right in muted text if the row is free; else "…" keeping at least 6 letters; else none (tap still works).
3. Tap zones: each bar grown to at least 44 × 44; where zones overlap, the nearer centreline wins.
4. Replaces the 112 px soft cap and the old calm-bar smoothing; the effort data is unchanged.
## Done when
- No bar exceeds its cap; a typical day draws about 18 px; heavier and lighter weeks are still visibly different.
## Tests
- Web: the formula and constants; smoothing windows per zoom; label fallbacks; tap-zone resolution.
