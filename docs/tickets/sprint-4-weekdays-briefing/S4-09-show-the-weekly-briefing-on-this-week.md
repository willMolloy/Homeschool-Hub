# S4-09 — Show the weekly briefing on This Week

**Source:** ROADMAP.md, "Weekly briefing on This Week"; Will's answers (late, plan problems, check-in nudge, heavy week well above usual)  
**Depends on:** S4-05, S4-08  
**Size:** M

## Goal
This Week shows a short status line per child, only when something needs attention, so a parent knows in seconds whether the plan is fine.

## Context
- This Week is `PlanPage` (`/`), with `useShownWeek` and per-child sections. The plan response has each `ChildPlan`'s `warnings`, `unplacedUnits`, `noCapacity`, `end` and `plannedEnd`.
- `GET /api/check-ins/weeks` lists finished weeks and whether each is checked in.

## Steps
1. For each child, collect lines in this order, at most 3 shown (then "and N more" that expands):
   - **Will finish late:** for each assignment where `forecastFinish` returns a date after its end: "{title} will finish about {n} weeks late at this pace."
   - **Plan problems:** unplaced work or `no-capacity`: "{title} has work that doesn't fit before {end}." / "{title} has no school days left."
   - **Heavy week:** if `heavyWeek(...).ratio >= HEAVY_WEEK_RATIO` for the shown week: "This is a heavy week for {child}."
   - **Check-in nudge:** if the family has checked in at least once and last week isn't checked in: "Last week isn't checked in yet." with a link to the check-in. Never shown to a family that has never checked in.
2. If a child has no lines, show nothing for them (no "all good" badge). If no child has lines, the briefing takes no space.
3. Lines are plain text in the calm style; no icons, colours or borders beyond the existing tokens.

## Done when
- Each line appears in its case and disappears when the cause is fixed.
- A family with nothing to flag sees This Week exactly as before.
- Works at 360 px; only what's essential.

## Tests
- Web: a plan with a late forecast, an unplaced assignment, a heavy week and an unchecked last week each show their line; a family that never checked in sees no nudge; more than 3 lines collapse to "and N more"; a clean plan shows no briefing.

## Out of scope
- Action buttons on lines (keep end date / push back), which need week adjust (C1).
- Email digests.
