# S2c-02 — Reject a check-in position below the week's start

**Finding:** M2  
**Depends on:** none  
**Size:** S

## Goal
A check-in can't record a position below where that week started (**D26**).
- The API answers 400.
- The card's number field has the same minimum as the slider, and shows an inline error for a lower number.

## Context
- `checkItem` (`apps/api/src/services/checkInService.ts`) only checks `position ≤ total`. The body schema already rejects negative numbers.
- The engine clamps a backwards position up to the previous check-in (`checkin-before-previous`). The stored actual and the plan then disagree, and the parent isn't told.
- `plannedFrom` is the week's start as planned *with* every earlier check-in. It is the earliest position that agrees with the plan.
- `ProgressAdjuster` uses `min={0}` on the number field but `min={plannedFrom}` on the slider.

## Steps
1. `checkItem`: if `position < plannedFrom − 1e-9`, throw 400 `invalid_request` with the message `items.N.position: can't be below where the week started (plannedFrom).`
   - The number is formatted like the total.
   - `planned` now picks `plannedFrom` too.
2. `ProgressAdjuster`:
   - The number field's `min` is the slider's `min`.
   - A number below it shows "Enter a number from {min} to {total}." and isn't sent.
3. An edit of an earlier week can make a later stored week's start move past its stored position. That week's stored row stays as it is (the engine clamps), and editing that week shows the new minimum.

## Done when
- [ ] A PUT with a position below `plannedFrom` returns 400 naming the item, and nothing is stored.
- [ ] A position equal to `plannedFrom` ("Didn't start") still saves.
- [ ] Typing below the minimum in the card shows the inline error, and the row keeps its last valid position.

## Tests
- `apps/api/test/check-ins-save.test.ts`:
  - below the start after an earlier check-in → 400 (the tester's repro: 5 vs 63.85);
  - equal to the start → 200.
- `checkItem` unit test for the bound.
- `apps/web/test`, ProgressAdjuster: the field's `min` attribute, and the inline error below it.

## Out of scope
- Recording repeated work (D26).
- Re-validating later stored weeks when an earlier week is edited.
