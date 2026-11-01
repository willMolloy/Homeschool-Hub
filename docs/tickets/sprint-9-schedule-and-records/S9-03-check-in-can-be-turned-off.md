# S9-03 — The check-in can be turned off

**Source:** Will, 2026-11-01 ("an optional feature attached to the schedule")  
**Depends on:** S9-02  
**Size:** S

## Goal
A family that doesn't want the weekly question can turn it off; the plan then simply assumes the work was done.

## Steps
1. Family settings: "Weekly check-in" switch, on by default (stored on the family; migration).
2. When on, the card stays until answered (Will, 2026-10-31). When off, no card, no nudge anywhere; Update status is still reachable from a bar's sheet.

## Done when
- Turning it off removes the card from Schedule and any Home mention; turning it back on brings it back for the latest unanswered week.

## Tests
- API: the setting round-trips. Web: card hidden when off; Update status still reachable.
