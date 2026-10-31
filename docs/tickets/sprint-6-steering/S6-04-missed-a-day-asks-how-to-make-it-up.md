# S6-04 — "Missed a day?" asks how to make it up

**Source:** Sprint 4 README, "Next, once C1 is decided"; Will's answer of 2026-10-30  
**Depends on:** S6-02  
**Size:** M

## Goal
After choosing a missed day, the parent picks how to make the work up: make it up this week, spread it evenly before the end date (default, today's behaviour), or push the end date back.

## Context
- S4-10 creates a `missed` day off; S4-00 spreads that day's work over the remaining days before the end date.
- "Make it up this week" and "Push the end date back" are week adjustments for that week (S6-02).

## Steps
1. The missed-day sheet gains a choice with three options. "Make it up this week" is hidden when no school day is left in the week for that child.
2. Save creates the missed day as now, then, per affected assignment and child with work on that day:
   - **Make it up this week:** a week adjustment keeping the week's planned amount (so the rest of the week carries it), mode keepEndDate.
   - **Spread evenly:** nothing more.
   - **Push the end date back:** a week adjustment of the week's planned amount minus that day's amount, mode pushEndDate.
3. Undo (S6-06) removes the day off and its adjustments together.

## Done when
- Each option produces the described plan: this week's remaining days carry the work; or later days carry it to the end date; or the end date moves later and the pace is unchanged.

## Tests
- Web: the three options send the right requests; "make it up this week" is hidden on the week's last school day. API/engine: plan checks for the three outcomes on a Mon–Fri assignment missing a Wednesday.

## Out of scope
- Missing one assignment instead of a whole day.
