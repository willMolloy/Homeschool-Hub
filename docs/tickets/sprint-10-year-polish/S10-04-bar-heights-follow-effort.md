# S10-04 — Bar heights follow effort at every zoom
**Source:** DeeDee's decision 1 (2026-11-03), which replaces the mockup's 20 px cap; year-polish-notes "The cap" · **Depends on:** S10-02 · **Size:** M

## Goal
A bar's height always shows its effort, at every zoom, clamped between a named minimum and maximum and scaled to the loads in the current view (the maximum is their 95th percentile).

## Context
- **Decided by DeeDee, 2026-11-03.** Heights are always dynamic, so effort shows at every zoom, and they are clamped between a minimum and a maximum.
- The scale is relative to the **current view**:
  - with one child selected, that child's loads set the scale;
  - under All children, every child's loads do.
- **Reviewed 2026-11-04, percentile change approved by DeeDee:** `viewMax` is about the **95th percentile** of the bar loads in the view, not the single heaviest. Loads above it clamp to `BAR_H_MAX`, so one unusually heavy week doesn't flatten every other bar.
- The minimum, the maximum and the curve are named, tunable constants, so values can be tried on real data.
- This replaces the earlier open question about a fixed 20 px phone / 22 px desktop cap. It also replaces today's 112 px soft cap and the old smoothing for calm bars. The effort data does not change.
- The zoom smoothing from the mockup stays: 3 weeks at Year, 1 week at a term, none at month.

## Steps
1. Put the constants in one place in `features/timeline/layout.ts` and export them:
   - `BAR_H_MIN` and `BAR_H_MAX`, set per breakpoint;
   - `BAR_CURVE`;
   - `EXTRA_ROW_FACTOR` (80 %);
   - `RIBBON_H_MIN` and `RIBBON_H_MAX`.
   - Starting values, to be tuned on real data: phone 8 → 28 px, desktop 8 → 32 px, curve 1.5, ribbon 4 → 12 / 5 → 14 px.
2. Compute the height:
   - `r = min(load / viewMax, 1)`, so loads above the 95th percentile clamp to the maximum;
   - `h = BAR_H_MIN + (BAR_H_MAX − BAR_H_MIN) × (1 − e^(−BAR_CURVE·r)) / (1 − e^(−BAR_CURVE))`.
   - So `viewMax` draws at exactly `BAR_H_MAX`, any load above 0 draws at least `BAR_H_MIN`, and a load of 0 draws no bar.
   - Height changes smoothly, never in steps.
3. Work out `viewMax` from the current view, as the 95th percentile of the bar loads in it (each lane's smoothed load on each school day where it is above 0):
   - one child: that child's bar loads;
   - All children: every child's bar loads, with Together bars counted once.
   - Take it over the whole school year at the current zoom's smoothing, so scrolling never rescales the bars.
   - The ribbon scales the same way: the child's total for the day against the 95th percentile of child-day totals in the view, clamped.
4. Set the lane pitch to `BAR_H_MAX` plus the existing gap, so the heaviest bar never touches its neighbour.
5. Add a dev-only tuning hook. In a dev build with `?debug=1` (`useDebugFlag`), `&bars=min,max,curve` overrides the three constants so values can be tried on real data. Parents never see it.

## Done when
- No bar is taller than `BAR_H_MAX` or shorter than `BAR_H_MIN`.
- Loads at or above the view's 95th percentile draw at the maximum; lighter loads draw lower.
- Switching between one child and All children rescales the bars.
- Heavier and lighter weeks are visibly different at Year, term and month zoom.
- Only what's essential: heights and constants, with no change to the effort data.

## Tests
- Web:
  - the formula: endpoints, monotonic, clamped;
  - `viewMax` is the 95th percentile, for one child and for All children (Together counted once), and loads above it clamp;
  - the smoothing window for each zoom;
  - ribbon scaling;
  - the debug override applies only in dev with `?debug=1`.

## Out of scope
- Labels (S10-04b) and tap zones (S10-04c).
- Any setting parents can see.
