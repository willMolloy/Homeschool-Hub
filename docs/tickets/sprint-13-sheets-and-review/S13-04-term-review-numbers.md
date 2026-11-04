# S13-04 — Term in review: the numbers
**Size:** S
## Goal
A read-only summary per child for a range (the family's term views or the year), using only real data.
## Steps
1. From Sprint 12: assignments with `ended_as = finished` and `ended_on` in the range, with subject and title.
2. From Records (only fields the family tracks): books read (log entries), hours by subject and school days (the same totals as Records, S9b-01 rules).
3. Anything not tracked or empty is absent, never zero.
## Done when
- The summary matches Records totals and the finished list for Fall in the demo family.
## Tests
- API or web: each part, untracked fields absent, range edges.
