# S9-02 — Retire the weekly check-in card

**Source:** Will, 2026-11-01 (logging and the schedule are separate; the check-in card "doesn't make sense")  
**Depends on:** S9-01  
**Size:** S

## Goal
The "Did everything get done?" card and the Track work page are gone; steering stays on the Schedule bars.

## Steps
1. Remove the check-in card, the Track work page and its nudges (Home, briefing). `/track` keeps redirecting to Schedule · Week.
2. Tapping a bar on Schedule (Week or Year) offers **Update status** ("got to p. 138, move to {date}") alongside the week adjustment, so a parent can still correct the plan's pace.
3. Keep the stored check-ins and their effect on the plan (no data is deleted); nothing new writes them except Update status.

## Done when
- No screen asks "Did everything get done?"; Update status works from a Week bar and from the Year edit bar.

## Tests
- Web: the card and page are gone; Update status reachable from both views; the plan still honours old check-ins.
