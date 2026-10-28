# S2c-06 — Record progress on an assignment with nothing planned that week

**Finding:** L4  
**Depends on:** S2c-02, S2c-05  
**Size:** M

## Goal
On the last-week card (and when editing a past week), parents can record progress on any active assignment for that child, including one with nothing planned that week (**D27**, DeeDee).

## Context
- `weekView` lists only pairs with planned work or a stored row. `saveWeek` rejects any other pair with 400 `invalid_reference` (the S2b-24 rule).
- The engine already handles progress in an unplanned week:
  - it puts the extra on the week's last school day, with `unplanned-progress`;
  - it replans from the next week with the chosen mode.
- The card's rows reuse `ProgressAdjuster` and `AbsorbChoice`.

## Steps
1. **API, read:** `WeekCheckInJson` gains `addable: CheckInItemJson[]`. These are the pairs the card can add, with `plannedFrom = plannedTo` = where the week started and `actual: null`, in the items' sort order.
   - The pair is active: the loader planned it, so it isn't archived.
   - There is no planned work and no stored row that week.
   - The week isn't entirely before the assignment's start. The engine ignores such a check-in (`checkin-outside-range`).
   - The work isn't already finished at the week's start (`plannedFrom < total`).
2. **API, write:** `saveWeek` accepts items for the `addable` pairs as well as `items` (relaxing S2b-24's `invalid_reference` for this case). Any other pair is still `invalid_reference`. The checks are the same:
   - S2c-02's minimum (the week's start);
   - at most the total;
   - "as planned" means within 0.5 of the start, so it isn't stored;
   - otherwise a mode is required, unless the work is finished.

   A saved unplanned pair has a stored row, so it then shows in `items`, as stored rows already do.
3. **Web:** under the planned rows, an "Add progress" button opens a list.
   - The list shows each child's `addable` pairs (child, then title).
   - Choosing one adds it as a row: the title with "nothing planned", `ProgressAdjuster` with minimum = the week's start, and "Got to" starting there.
   - Moving it ahead shows the ahead choice (thin the bars or pull the end in), joining "Apply one choice to all" with the other ahead rows.
   - An added row can be removed again before saving.
   - In prompt mode, when last week had *no* planned rows, the card still doesn't appear (it never nags). Past-week edit mode offers "Add progress" for any week with addable pairs.
4. **Behind:** behind is possible only on planned rows (a minimum equal to the plan means an unplanned row can't fall behind). It uses thicken or push, as today.

## Done when
- [ ] GET returns `addable` with the rules above. Planned and stored rows are never listed as addable.
- [ ] A PUT for an addable pair saves. The plan places the extra in that week and replans the rest with the chosen mode.
- [ ] A PUT for an archived or unrelated pair, or a week entirely before the start, is still 400 `invalid_reference`.
- [ ] A position below the week's start is 400 (S2c-02).
- [ ] The card's "Add progress" adds a row, and the ahead choice appears and is sent.

## Tests
- `apps/api/test/check-ins-read.test.ts`, `check-ins-save.test.ts`:
  - addable rules;
  - save of an unplanned pair (pull in and thin);
  - the rejected cases;
  - a stored unplanned row shows in `items` afterwards.
- The engine already covers `unplanned-progress`. Add one D24-style check that a later check-in still wins.
- `apps/web/test`, LastWeekCard: add a row, ahead choice, save body; remove a row; no "Add progress" with no addable pairs.

## Out of scope
- Showing the card in prompt mode for weeks with nothing planned.
- Progress before an assignment's start date.
