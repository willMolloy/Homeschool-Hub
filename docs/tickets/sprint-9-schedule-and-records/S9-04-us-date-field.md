# S9-04 — A calm date field in US style

**Source:** UX review fix 3; Will, 2026-11-01 ("US… we will use that date style")  
**Depends on:** none  
**Size:** M

## Goal
Every date the parent sees or picks reads like "Nov 1, 2026", in one shared date field, instead of the browser's `mm/dd/yyyy` box.

## Steps
1. A shared `DateField`: shows "Nov 1, 2026" (short form "Nov 1" where space is tight); opens a small calendar sheet on tap; keyboard entry still works; 44 px.
2. Use it on Add assignment, the Year edit bar (start/end), days off, events, zoom views and the Records date range.
3. One formatting helper for all displayed dates (en-US).

## Done when
- No `mm/dd/yyyy` box remains on any parent-facing screen; dates read "Nov 1, 2026" in light and dark at 360 px.

## Tests
- Web: format helper; DateField picks, types and clears; each screen uses it.
