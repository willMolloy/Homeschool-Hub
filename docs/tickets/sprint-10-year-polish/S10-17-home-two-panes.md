# S10-17 — Home in two panes on wide screens
**Source:** DeeDee's decision 3 (2026-11-03); UX review improvement 6 · **Depends on:** S10-16 · **Size:** S

## Goal
At 840 px and wider, Home shows a wide pane with the briefing and the Schedule card beside a narrow pane with Records and the getting-started checklist.

## Context
- **Decided by DeeDee, 2026-11-03:** Home becomes two panes at 840 px and up. The wide pane holds the briefing and the Schedule card. The narrow pane holds Records and the getting-started checklist. No widget dashboard.
- Today `HomePage.tsx` stacks, in this order:
  - the header (logo and family button);
  - the greeting and date;
  - the briefing;
  - the checklist;
  - the Schedule card;
  - the Records card;
  - the Set up row.
- Follows the list-detail and supporting-pane patterns in [Material 3 canonical layouts](https://m3.material.io/foundations/layout/canonical-layouts).

## Steps
1. At 840 px and up, lay Home out in two panes with a 24 px gap, centred, about 1040 px wide at most:
   - the wide pane is flexible, at least 480 px;
   - the narrow pane is 320–360 px.
2. Wide pane: the briefing, then the Schedule card. Narrow pane: Records, then the checklist (when it shows), then the Set up row.
3. The header, greeting and date span the top.
4. Under 840 px, keep today's single column in today's order.

## Done when
- At 1280 px Home shows the two panes as described.
- At 800 and 390 px it is a single column, unchanged.
- Only what's essential: layout only, with no new cards.

## Tests
- Web: the panes and their contents at 840 px and up; a single column below 840 px.

## Out of scope
- The content of the cards.
