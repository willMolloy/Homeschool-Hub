# S9-01 — Navigation: Home · Schedule · Records

**Source:** Will, 2026-11-01 (the two main jobs are Schedule and Records)  
**Depends on:** none  
**Size:** S

## Goal
The tab bar is Home · Schedule · Records, and Home's two big cards are Schedule and Records.

## Steps
1. Tabs (with icons): Home, Schedule, Records. Track work is no longer a tab.
2. `/track` (and its query) redirects to `/schedule?view=week`; `/records` is the new page (a placeholder until S9-04).
3. Home shows two equal cards, Schedule and Records, and drops the Track work card (this also removes its "All done" next to "needs a quick check" contradiction, UX review).

## Done when
- At 360 and 1280 px the tabs read Home · Schedule · Records; an old /track link lands on Schedule · Week.

## Tests
- Web: tabs, the redirect, Home's two cards.
