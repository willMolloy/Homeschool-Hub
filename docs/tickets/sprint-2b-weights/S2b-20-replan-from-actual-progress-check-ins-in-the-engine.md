# S2b-20 — Replan from actual-progress check-ins in the engine

**Depends on:** S2b-18  
**Size:** M

## Goal
The engine accepts explicit "where are we really" check-ins per assignment and child. It re-anchors the plan at each check-in, then absorbs the difference in the way the parent chose: **thicken or thin** the remaining weeks (keep the end date), or **push or pull** the end date (keep the pace).

## Input
```ts
/** Parent-confirmed position at the end of a week (cumulative units done since the assignment's start). */
export interface ProgressCheckIn {
  assignmentId: string;
  childId: string;
  weekStart: LocalDate;      // normalized like WeekOverride.weekStart
  position: number;          // 0..totalUnits; clamped with a warning
  mode: OverrideMode | null; // keepEndDate = thicken/thin, pushEndDate = push/pull end; null = on plan
}
PlanContext.checkIns?: ProgressCheckIn[];
```
There is no row for "untouched = done as planned", so there's nothing to send.

## Algorithm
1. Plan from the start as in S2b-18. Call this segment 0.
2. Sort this child's check-ins by `weekStart`; a duplicate week means the last one wins, with a warning. For each check-in, at `anchor = weekStart + 7 days` (the first day after that week):
   - `done = clamp(position, 0, total)`, and `remaining = total - done`.
   - Throw away the plan from `anchor` on, and replan `remaining` from `anchor` using `mode`:
     - `keepEndDate`: spread over capacity up to the current end. Behind → thicker bars; ahead → thinner bars.
     - `pushEndDate`: keep the segment's previous `baseRate`. Behind → the end moves later; ahead → the end moves earlier (pulled in).
     - `null`: treat it as `keepEndDate`. If `done` equals the planned position the result is identical anyway.
   - `remaining = 0` → no days after `anchor`, `complete: true` and `finishedEarly: true` if `anchor <= E`.
3. **The checked-in week itself:** scale its planned units so they sum to `done - positionAtWeekStart`, proportionally over that week's planned days, so past bars show what really happened (**decision D9**). If the week had no planned days and the parent says they did work, place it on the week's last capacity day, with a warning `unplanned-progress`.
4. Overrides that fall after an anchor still apply inside the new segment.
5. Output additions:
   - `DayLoad.position`: cumulative units done at the end of that day.
   - `ChildPlan.checkInWeeks: LocalDate[]`.
   - `ChildPlan.finishedEarly?: boolean`.
   - A helper `plannedRangeForWeek(plan, weekStart): { from: number; to: number; hasPlannedWork: boolean }` for the check-in card (S2b-23).
6. Keep `planChild` readable: put this in `checkins.ts` (applying the anchors) and reuse the existing keep/push placement functions. Don't duplicate them (SRP).
7. Set `ENGINE_VERSION` to `0.5.0`.

## Done when
- [ ] The example from DeeDee's message, week 1 planned pp. 1–80 and they got to 65:
  - Keep end date → the remaining 119 pages are spread to the same end, with thicker bars.
  - Push → the same daily pace, and the end moves later by about 15 pages' worth of days.
- [ ] Got to 100 of a planned 80:
  - Keep → thinner bars.
  - Push → the end is pulled in.
- [ ] Position = total → nothing after that week, and `finishedEarly`.

## Tests (`packages/engine/test/checkins.test.ts`)
- The four behind/ahead × mode cases.
- On plan (position = planned) with each mode → identical to no check-in.
- Two check-ins in sequence; editing the earlier one doesn't override the later anchor.
- A position beyond total → clamped with a warning; a negative position → 0 with a warning.
- A check-in for a week before the start or after the end → ignored with a warning.
- Multi-child: check-ins are per child, so Frank's plan doesn't change when Margaret's is checked in.
- Vacation: a check-in week fully blocked with position = previous → no scaling and no warning.
- A blocked week after the anchor gets no work.
- Invariants: finite, `position` non-decreasing, the final position equals total unless `unplacedUnits` > 0, and `thickness = units × weight`.

## Out of scope
- Storage (S2b-21) and the UI wording (S2b-25/26).
