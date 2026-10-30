# S4-01b — Changing days mid-assignment keeps progress to date

**Source:** review of the Sprint 4 tickets (2026-10-30)  
**Depends on:** S4-01, S4-02  
**Size:** M

## Goal
Changing an assignment's weekdays (directly, or through its subject's default) after it has started keeps the progress made so far and replans only what's left on the new days.

## Context
- With S4-01 alone, new weekdays apply to the whole range, so past days are re-spread like the missed-day problem in S4-00 and the position at today can jump.
- There is no history of earlier weekdays, so the change needs a date it takes effect from.

## Steps
1. Add `assignment.weekdays_from date NULL` and `assignment.previous_weekdays smallint[] NULL` (in migration 009 if S4-02 hasn't been committed yet, otherwise migration 010).
2. API: when an assignment's effective weekdays change and its start is before the start of the family's current week, set `weekdays_from` to the start of the current week and `previous_weekdays` to the effective weekdays before the change. When a subject's `defaultWeekdays` changes, do the same for each of its uncustomised assignments that has started. A later change overwrites both (only one level of history; earlier weeks are assumed done anyway).
3. Engine: `Assignment` gains `weekdaysFrom?` and `previousWeekdays?`. Days before `weekdaysFrom` use `previousWeekdays`; days from it use the current weekdays. The position at the end of the week before `weekdaysFrom` is kept, and what's left is replanned from `weekdaysFrom` with keepEndDate (the same anchoring as S4-00).
4. Bump `ENGINE_VERSION`.

## Done when
- Switching a started Mon–Fri assignment to Fridays only keeps every past day as it was and places the remaining work on Fridays from this week.
- Changing the days before the assignment starts behaves exactly as S4-01 (no `weekdays_from` stored).

## Tests
- Engine: the switch above; a switch back; a subject-default change on an uncustomised assignment; a change before the start. API: `weekdays_from` and `previous_weekdays` are set only for started assignments, and for a subject change only on uncustomised ones.

## Out of scope
- A full history of weekday changes.
