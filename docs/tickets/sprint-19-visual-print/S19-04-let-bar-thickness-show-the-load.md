# S19-04 — Let bar thickness show the load

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** M

## Goal

A light day and a heavy day look clearly different in bar thickness, and the bars are a little more opaque without becoming solid.

## Context

Thickness is the day's load. She saw about 40 minutes a day and about 150 minutes a day drawn at almost the same width. Year bars scale to about the 95th percentile of the loads in the view (`VIEW_MAX_PERCENTILE`), then a curve lifts lighter loads (`BAR_CURVE` 1.5), between 8 px and 28 px on a phone or 32 px on a desktop. A steady load is not changed by year smoothing, so those two days should already differ unless the clamp or the curve flattens them.

The bar opacity token is already 1. The fills are mixed with the page colour, which is why they look pale. She asked for slightly more opaque, not a solid poster colour. No exact mix was chosen.

Do not change how minutes are stored, and do not change the minutes question on the assignment form. That is Sprint 20.

## Steps

1. In one year view, a bar at about 40 minutes a day is plainly thinner than a bar at about 150 minutes a day. The same pair stays distinct at a term zoom and at month zoom.
2. If the 95th-percentile clamp or the curve is why they match, change that scale. One unusually heavy week may still be kept from flattening every other bar.
3. Make the painted bar a little stronger than it is now, and keep it clearly pastel. Selected, dimmed, and All-subjects bars stay readable. Inside names keep their contrast.
4. **Default, not a blocker:** the heavier bar's height is at least one and a half times the lighter bar's, and the lighter bar is not stuck on the minimum only because its load is above zero. Prefer a curve closer to a straight line before dropping the clamp entirely. Record the curve, the percentile, and the fill mix in the sprint progress doc.
5. **Default, not a blocker:** strengthen the subject fill by mixing in less page colour. Do not set a new opacity above 1, and do not paint a flat solid.

## Done when

- The 40-minute bar and the 150-minute bar are easy to tell apart at Year zoom.
- Bars look a little more opaque than before this ticket, and they are not solid.
- Stored minutes, totals, and weights are unchanged.

## Tests

- Web: a fixture year with a steady 40 min/day assignment and a steady 150 min/day assignment; the heights meet the check in step 4 at Year, term, and month, for one child and for all children. A single very heavy week does not shrink the 150-minute bar down to the 40-minute one. Contrast for inside names still passes in light and dark.

## Out of scope

- Asking only for minutes a day, or dropping a total for a minutes assignment (Sprint 20).
- The Week Bars / Days toggle, and the printed sheet (S19-05).
- Break titles (S19-06).
