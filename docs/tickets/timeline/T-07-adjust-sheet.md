# T-07 — Adjust sheet

**Source:** the Timeline Tools Page build order, plus DeeDee's T-02b hand-test rule. **Depends on:** T-04 (and builds on T-05c). **Size:** M.

## Goal

A parent taps a bar on the timeline and gets a small sheet for that assignment. The sheet can end it one week earlier or later, and reset that change. Nothing about adjusting shows until something is selected.

## Context

- The T-02b hand test found "End one week later", "End one week earlier" and "Reset" showing before anything was selected (in the prototype). DeeDee's rule: they are **hidden, not disabled**, until an assignment or activity is selected, and a test covers it.
- `hit.ts` (T-03) already resolves a tap to one bar or none with 44 px targets. `ResponsiveSheet` (T-03b) is a Drawer on phones and a Dialog on wider screens.
- `PATCH /api/assignments/:id` accepts `{ endDate }` alone and checks the date order on the merged row.

## Steps

1. `select.ts` (pure): `shiftEnd(end, weeks)` (±7 days per week), `canEndEarlier(start, end)` (the new end must not fall before the start) and `selectionFor(model, assignments, id)` (title, subject · children, dates).
2. `AdjustSheet.tsx`: `ResponsiveSheet` titled with the assignment's title. The body is one line with the subject and child (`Reading · Ada`), one line with the dates (`Sep 1 – Oct 30, 2026`), then the buttons:
   - **End one week earlier**: left out when the new end would fall before the start.
   - **End one week later**.
   - **Reset**: only once the end has been changed in this visit. It puts back the end the assignment had when it was first changed.
   - While a save runs, the buttons are disabled. A failed save shows the API's message in an alert inside the sheet.
3. `Timeline.tsx`: an optional `selectedId`. With a selection, the other bars and their names dim (a class, opacity only; no outline or border).
4. Page:
   - A click or tap on the picture runs `hitTest`. A hit selects that assignment and opens the sheet. A miss clears the selection.
   - Closing the sheet clears the selection.
   - The selection lives beside the zoom on the page. The sheet is modal, so the zoom can't change while something is selected, and closing it clears the selection.
   - Saving sends `PATCH /api/assignments/:id { endDate }`, then `useTimelineData().refresh()` refetches the plan and the assignments, so the bars redraw from the engine.
5. Keyboard and screen readers: each assignment in the visually hidden lanes list becomes a button that selects it. The list becomes visible while focus is inside it, so a keyboard user can see where they are.

## Done when

- [ ] Tapping a bar opens the sheet for that assignment, and other bars dim. Tapping empty space or closing the sheet clears it.
- [ ] "End one week earlier", "End one week later" and "Reset" are **not in the DOM** until something is selected (hidden, not disabled), with a test.
- [ ] Earlier and later move the end by 7 days through the API, and the timeline redraws. Reset restores the first end, and shows only after a change.
- [ ] Keyboard users can select from the lanes list.
- [ ] **Only what's essential:** the title, one subject · child line, one date line and the buttons. No helper text, badges, borders or confirmation step.

## Tests

- New `apps/web/test/timeline-adjust.test.tsx`:
  - no adjust buttons anywhere before a selection (queried by name: absent, not disabled)
  - a tap on a bar opens the sheet with its title, subject · child and dates, and other bars dim
  - a tap on empty space selects nothing
  - End one week later sends `PATCH { endDate: end + 7 }` and refetches the plan
  - End one week earlier is left out when it would cross the start
  - Reset is absent before a change, then sends the original end
  - a failed save shows the message
  - the lanes list buttons select
  - `shiftEnd`, `canEndEarlier`

## Out of scope

- The minutes-per-day stepper, and choosing between making a bar thicker or pushing it later. Both need engine choices that aren't made yet, so they wait for a later ticket.
- Selecting event strips (activities): they are only drawn in the month view, and editing an event's dates is the Events screen's job. Recorded under the T-07 decisions.
- Manual pinch, ctrl+wheel zoom and pan (T-07b), drag to resize (T-08) and drag to move (T-09).
