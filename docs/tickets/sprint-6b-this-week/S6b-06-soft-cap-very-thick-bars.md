# S6b-06 — Soft-cap very thick bars on the timeline

**Source:** Will's review (2026-10-31): "the bar gets enormously thick if I have like 300 pages in a day. We should have a max bar." Will chose a soft cap.  
**Depends on:** none  
**Size:** S

## Goal
No bar on the timeline grows past a maximum height, and heavier days still look heavier than lighter ones.

## Context
- The timeline scales thickness linearly with `PX_PER_THICKNESS` (2.8 px per point, `features/plan/scale.ts`) through `bandHeight` / `smoothColumns` in `features/timeline/layout.ts`, with no ceiling: 300 pages a day at normal effort is about 840 px. `thicknessToPx` in `scale.ts` already clamps at `MAX_BAR_PX` (100) but only the picker preview uses it.
- A typical day is about 20 pages at normal effort (`TYPICAL_DAY`, `REFERENCE_THICKNESS` = 20 points ≈ 56 px).

## Steps
1. In `scale.ts`, add one soft-cap function used by every bar (timeline daily and smooth bands, row heights, the picker preview): linear up to a knee (`SOFT_CAP_KNEE_PX`, start at 56 px, a typical day), then compressed so it approaches but never passes `MAX_BAR_PX` (start at 96 px), strictly increasing (e.g. knee + (max − knee) × (1 − e^(−(raw − knee)/(max − knee)))). Keep `MIN_BAND_PX`.
2. Route `bandHeight`, `smoothColumns` and `rowHeight` through it, so lane rows size to the capped height.
3. The All subjects strip keeps its own normalisation to its peak (unchanged).

## Done when
- A 300-pages-a-day assignment draws no taller than 96 px; 20 pages a day draws exactly as before; 100 pages a day is taller than 60 pages a day.
- Constants are named and documented as the ones to tune.

## Tests
- Unit (`scale.ts`): below the knee unchanged; monotonic above it; never above the max; non-finite and negative inputs draw nothing. Layout: a row with a huge bar is capped; existing layout tests unchanged for normal values.

## Out of scope
- Changing `PX_PER_THICKNESS`; a legend.
