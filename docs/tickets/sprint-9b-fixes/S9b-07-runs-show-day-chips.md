# S9b-07 — A run of days shows which days count

**Source:** Will, 2026-11-01 ("This is flexible to people that don't use a traditional 5-day schedule right?"); coordinator proposal, logs never assume.  
**Size:** S

## Goal
When a log entry covers a run of days, the parent sees and controls exactly which days count as school days.

## Steps
1. For a date range, show day chips (one per date in the run, e.g. "Mon 2 · Tue 3 …"; for runs over 14 days, weekday chips M T W T F S S that apply across the run).
2. Pre-select the family's usual school days with days off unselected; the parent taps to change any.
3. The entry stores the chosen dates and counts exactly those; its summary says which ("Mon–Sat, 6 days").
4. Single-day entries are unchanged (always count, with the existing switch).

## Done when
- A Mon–Fri family logs Mon–Sun with Saturday ticked and gets 6 school days; a Tue–Sat family's run pre-selects Tue–Sat.

## Tests
- API: stored dates drive the count; Records totals follow them. Web: chips pre-select, toggle, and the summary text.
