# S7-05 — Edit the zoom views

**Source:** Will, 2026-10-31 (a quiet Edit; show/hide built-ins; add, rename, delete, reorder; at most 6)  
**Depends on:** S7-04  
**Size:** M

## Goal
A quiet **Edit** at the end of the zoom row lets a parent hide built-in views and manage their own, without adding clutter for families who don't care.

## Steps
1. Add a low-emphasis "Edit" button at the end of the zoom row (44 px, no icon or badge).
2. It opens a sheet (`ResponsiveSheet`) listing: Year (always on, no switch); Fall, Spring and This month with show/hide switches; the custom views with rename, dates, delete, and move up/down.
3. **Add a view** asks for a name and the first and last day. It is disabled with "You can show up to 6 views." when six are visible.
4. Save sends one `PATCH /api/family` with `zoomViews`; Cancel discards.

## Done when
- A parent hides Fall and Spring, adds Term 1, Term 2 and Term 3, reorders them, and the row shows Year, Term 1–3, This month.
- 360 px; 44 px; only what's essential.

## Tests
- Web: switches, add, rename, re-date, delete, reorder, the 6-view limit, Save sends the right body, Cancel sends nothing.

## Out of scope
- Creating views from days off automatically (dropped by Will).
