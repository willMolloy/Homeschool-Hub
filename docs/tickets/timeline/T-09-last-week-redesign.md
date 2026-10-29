# T-09 — "How did last week go?" redesign

**Source:** DeeDee (2026-10-28): "Should just be a spot where the default is everything went according to schedule and you did the scheduled work but you can adjust each very simply to be reflected in the schedule visualizer. Minimalist, clean, pastel color theme." **Depends on:** T-03b, T-08c. **Size:** M.

## Goal

Confirming last week takes one tap. Adjusting one assignment takes two or three, and the timeline reflects it.

## Steps

1. `CheckInRow`: collapsed row (pastel tint, title, short plan, quiet check). Tapping opens it inline to show As planned / Less / More and a − / + stepper. A changed row shows "2 of 3 ch." and Undo.
2. `amount.ts`: amounts within the week, short plan text, steps and the compact state (pure).
3. `LastWeekCard`: the header "Last week · Oct 19–25", a child picker when there is more than one child, "Everything went as planned.", Looks right (Save once changed), Skip, the rows, and "Add progress on something else" at the bottom. Edit mode is the same rows plus Save.
4. `ChildAdjustment`: the sheet uses the same rows and is titled "Name · Last week · Oct 19–25".
5. Same check-in API and engine semantics. New differences use keepEndDate.

## Done when

- [ ] By default every row reads as planned, with no controls showing, and Looks right saves `reviewed` with no items.
- [ ] A tapped row shows only the three-way choice and, off plan, the stepper. Undo puts it back.
- [ ] Saving refetches the plan (so the timeline changes), shows a brief thanks, then the card is gone.
- [ ] The sheet on This Week uses the same row component and title.
- [ ] Targets are at least 44px; the card is centred with a max width of 560px.
- [ ] **Only what's essential:** no counts, helper text, badges or borders.

## Tests

- `apps/web/test/checkin-row.test.tsx` (new), `apps/web/test/last-week-card.test.tsx` (rewritten), `apps/web/test/this-week.test.tsx` (updated).
