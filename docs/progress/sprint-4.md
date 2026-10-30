# Sprint 4 progress — assignment weekdays, the weekly briefing and "Missed a day?"

Tickets: `docs/tickets/sprint-4-weekdays-briefing/`. Pass 1 (engine and data): S4-00, S4-01, S4-02, S4-01b, S4-03, S4-04, S4-05, S4-08.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S4-00 A missed past day carries its work forward | d5bf88f | Migration 009 (`missed` kind); engine 0.7.0: `reanchor.ts` (`replanFrom`), `missed.ts` (`pastMissedDays`) |
| S4-01 Plan an assignment only on its weekdays in the engine | (this commit) | Engine 0.8.0: `weekdays.ts` (`weekdaysOf`, `validWeekdays`); `ChildPlan.weekdays` and `weekdaysSource` |

## Decisions (conservative calls on ambiguous points)

- **S4-00 migration number.** `009_missed_kind.sql` (S4-00 is built first, so it takes 009; the weekdays migration is the next free number).
- **S4-00 what counts as past.** A `missed` day is handled by the new rule when it is on or before `ctx.asOf` (today counts, as the README says "today or earlier"). A `missed` day after asOf, or when no asOf is given and the day is after the assignment's start, is an ordinary day off. The default asOf is the start, as elsewhere.
- **S4-00 a range.** A `missed` block can span several days; each day in it (from the assignment's start to asOf) is a missed day and they apply in date order.
- **S4-00 days with no work.** If the plan placed no units on the missed day (no capacity for this assignment, nothing left, before the start), nothing is replanned (exactly no change); the day still shows 0 capacity.
- **S4-00 the replan.** Remaining units from `d + 1` go through `placeSegment` with keepEndDate to the plan's current end (the planned end, or the pushed end of a pushEndDate week). If `d` is the last day with capacity, nothing can be placed: the work is reported as `unplacedUnits` with `no-capacity` (no end date is invented).
- **S4-00 override weeks.** When the missed day falls inside a week override, the units the week still has to place (from the missed day on) stay fixed on the rest of that week; the units before it are kept.
- **S4-00 rates.** `baseRate` stays the original pace (a check-in's pushEndDate still keeps it); `rate` is the replanned rate; `mode` is unchanged.
- **S4-00 check-ins.** A missed day on or before the last check-in's week is handled on the plan before the check-ins are applied (the check-in then wins: its position and replan are as without the missed day, except the missed day shows 0 units). A missed day after the last check-in's week is handled on top of the check-ins.
- **S4-00 web.** `KIND_LABELS` gets "Missed day". The Days off form does not offer "Missed day" as a new kind (it is made from This Week, S4-10); an existing missed row still shows its kind when edited.
- **S4-00 changed test.** `apps/web/test/engine-version.test.tsx` pins the engine version; it now expects 0.7.0 (the ticket bumps it).
- **S4-01 what is a valid list.** Non-empty and every entry an integer 0-6; repeats are dropped and the list is sorted. Anything else (empty, 7, 1.5, not an array) is no choice, and an invalid own list falls back to the subject's default.
- **S4-01 where the mask sits.** A day outside the weekdays has capacity 0 for that assignment (`DayLoad.capacity` 0), but `DayLoad.schoolDay` still says whether it is a school day for the child, as it is a property of the family, not of the assignment. Because capacity is 0, such days do not count as capacity days in `weeklySummary`.
- **S4-01 changed test.** `apps/web/test/engine-version.test.tsx` now expects 0.8.0.
- **S4-01 web fixtures.** `plan-debug.test.tsx` and `this-week.test.tsx` build ChildPlan objects by hand; they gained `weekdays: null, weekdaysSource: "default"` (type only, no expectation changed).
