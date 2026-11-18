# S18c-05 — Keep adjacent break titles apart

**Source:** Low, from the Sprint 19 tester round 2. **Depends on:** Sprint 19, merged (PR #21). **Size:** S. This file does not build it. Build it after Sprint 21, with S18c-01 to S18c-04.

## Goal

On the Year view, the titles of two long breaks that sit next to each other never draw on top of each other.

## Context

At 360 px and at 440 px, adjacent long-break titles overlap by about 20 px. "Christmas break" and "Family visit" render as "Christmas bFamily visit". At 1280 px the same titles sit apart and read in full. The names themselves are right; only the placement at a narrow width is wrong.

## Steps

1. At 360 px and at 440 px, two neighbouring long-break titles do not overlap. A title may truncate, or the two titles may stagger, so each one can be told apart.
2. At 1280 px, titles that fit today still fit.
3. A single long-break title is unchanged aside from whatever truncation it already uses when it does not fit.

## Done when

- Adjacent break titles never overlap at any width. They truncate or stagger instead.
- At 1280 px, "Christmas break" and "Family visit" still read in full when they fit today.

## Tests

- Web: two adjacent long breaks at a narrow year view do not overlap their titles, and at 1280 px both titles still fit when they fit today.

## Out of scope

- Renaming breaks, or deciding which breaks appear on the year view (Sprint 19).
- S18c-01 to S18c-04.
- Sprint 21.
