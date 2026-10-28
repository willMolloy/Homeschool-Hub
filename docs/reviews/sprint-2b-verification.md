# Sprint 2b verification (weights and the weekly check-in)

Tester verification of the 37 tickets in `docs/tickets/sprint-2b-weights/` at `origin/main` a50f458.
Date: 2026-10-28. No product code was changed for this review.

## Result: PASS, with medium follow-ups

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate; 301 engine, 305 × 8 tz, 55 db, 756 api/web tests).
- No high-severity issues. Two medium issues, both reproduced against the real API (scratch probe tests on `hh_test`, since deleted).
- 360px UI: home card, Adjust view, two-rows-behind view, past-week picker and edit, subject width picker, Assignments list and Add form. **No horizontal overflow on any screen** (scrollWidth = 360). No page errors.

### Verified as meeting the acceptance criteria

- Editable weight per unit, bounds 0.01–100 to 2 decimals, built-ins page 1 / chapter 10 / lesson 15 / minutes 0.5.
- Learned per-child default (`packages/engine/src/weights.ts` `usualWeight`): latest choice per assignment, cleared ones dropped, newest 5 kept; 5 gives the middle 3, 4 gives the middle 2, 1–3 give the plain mean, 0 falls back. Pages and chapters only.
- Precedence: assignment, then learned, then subject default, then built-in (`weightPerUnitOf`, `suggestWeight`).
- `weight_choice` is append-only and written in the save transaction.
- Subject default width and the thickness picker (presets, Custom, preview caption).
- The schedule assumes planned work was done. `apps/api/src/plan/loadPlanInputs.ts` never reads the log tables.
- "How did last week go?" card:
  - "Went as planned" works.
  - Adjust offers keep end date (preselected) or push end date, and "Apply one choice to all N rows behind" appears for 2+ rows.
  - "Skip" counts as done, and a skipped PUT is rejected if it has items.
  - Editing a past week sends the whole week (replace semantics), and the later-check-ins note is shown.

### Excluded (already known)

- The "Light7.5" label spacing nit.
- Case 6: editing week 1 after week 2 used push moves later bars (open product question).
- L-N1 to L-N7.

---

## High

None.

## Medium

### M1. Changing the family's week start orphans saved check-ins and reviews

After the week start changes, every stored check-in and `week_review` row is keyed to a date that is no longer a week start:

- The home card prompts again for a week that was already reviewed.
- The past-week picker shows no check-ins.
- The stored week can't be opened or edited.
- The planner still applies the stored check-in, silently, with an internal `checkin-misaligned` warning.

The parent ends up with a plan shaped by a check-in they can no longer see or change. If they answer the re-prompt, two check-ins map to the same engine week and only one of them wins.

**Repro** (confirmed through the API on `hh_test`, today pinned to 2026-10-28):

1. Use a family whose week starts Monday. `PUT /api/check-ins` with `weekStart: "2026-10-19"` and status `reviewed`, with one adjusted item. Response: 200.
2. `PATCH /api/family {"weekStart":"sun"}`. Response: 200.
3. `GET /api/check-ins/last-week` returns `weekStart 2026-10-18, status null`, with every item `actual: null`, so the card asks again.
4. `GET /api/check-ins/weeks`: all four weeks have `hasCheckIns: false, status: null`.
5. `GET /api/check-ins?weekStart=2026-10-19` returns 400 "weekStart: must be the first day of a week (a Sunday)."

**Files**

- `apps/api/src/services/checkInService.ts`: `resolveWeek`, `storedFor`, `listWeeks`.
- `apps/api/src/routes/family.ts`: the week-start PATCH.
- `packages/engine/src/checkins.ts`: the misaligned mapping.

**Suggested fix (pick one)**

- Re-key `progress_checkin.week_start` and `week_review.week_start` to the new week start in the same transaction as the family PATCH, merging any collisions.
- Or block the change while check-ins exist, and show a clear message in Settings.

Add an API test for each.

### M2. A check-in position lower than an earlier week's is accepted, then silently ignored by the plan

`checkItem` only checks `0 ≤ position ≤ total`. In the UI, the number field allows 0..total, while the slider's minimum is `plannedFrom`.

The engine clamps a backwards position up to the earlier check-in (`checkin-before-previous`). So the saved and displayed actual ("Got to chapter 0 … 32 behind") disagrees with what the schedule uses, and no error reaches the parent.

**Repro**

1. API (confirmed): check in week 2026-10-12 with an item adjusted. Then check in week 2026-10-19 for the same item with `position: 5`, below that week's `plannedFrom` of 63.85. Response: **200**, stored. The plan still starts the item at 63.85, with warning `checkin-before-previous`.
2. UI at 360px (confirmed): Home, then "How did last week go?", then Adjust. On the Math 5 row, type `0` in the "Got to" field. The label reads "Got to chapter 0 of 32 planned (32 behind)" with no error. The slider can't go below `plannedFrom`, so the two controls disagree.

**Files**

- `apps/api/src/services/checkInService.ts` (`checkItem`).
- `apps/web/src/features/checkin/ProgressAdjuster.tsx`: number field `min={0}` vs slider `min={plannedFrom}`.
- `packages/engine/src/checkins.ts` (clamp).

**Suggested fix**

- In the API, reject a position below the previous stored check-in's position, or below `plannedFrom`, with 400 and a clear message.
- In the UI, set the field minimum to match the slider and show an inline error.
- Decide and document whether a parent may record going backwards (for example, "we redid chapter 3"). If they may, the engine needs to honor it rather than clamp.

## Low

### L1. ThicknessPicker Custom: invalid or empty input shows an error but Save still saves the old value

With Custom selected and the box cleared, the picker shows "Enter a weight." but doesn't call `onChange`. The form's Save stays enabled and saves the previous valid weight. The preview also keeps showing the old value ("1 lesson a day ≈ 30 min"). Confirmed at 360px.

- **Repro:** Subjects, then Math, then "Default bar width". Choose Custom, clear the field, and press Save. The saved value is the previous one, with no feedback.
- **Files:** `apps/web/src/components/ThicknessPicker.tsx`, `apps/web/src/features/roster/SubjectForm.tsx`, and the assignment form that uses the same picker.
- **Fix:** report validity to the parent (for example `onValidityChange`, or `onChange(null, {invalid:true})`) and disable Save, or block submit, while it's invalid.

### L2. The assignment form can save a stale or missing weight suggestion

- If the form is submitted while `useWeightSuggestion` is still loading, the weight is saved as null, so the learned per-child default is lost for that assignment.
- After changing the selected children, the hook keeps showing the last answer for the same unit until the new one arrives. A quick Save stores the previous children's suggestion.
- **File:** `apps/web/src/features/schedule/AssignmentsPage.tsx` (around line 98), `useWeightSuggestion.ts`.
- **Fix:** key the suggestion on (unit, children). Disable Save, or send "no explicit weight", while it's pending.

### L3. The past-week picker doesn't refresh after saving from the home card

Saving the "How did last week go?" card in prompt mode leaves the picker's labels ("Not reviewed") stale until reload, because it uses a separate `useApi` fetch.

- **Files:** `apps/web/src/features/checkin/LastWeekCheckIn.tsx`, `PastWeekPicker.tsx`.
- **Fix:** refetch the picker, or share state, after a save.

### L4. No way to record work done in a week with no planned work

`GET /api/check-ins?weekStart=2026-08-03` (a week before any assignment starts) returns `items: []`. A PUT with an item for that week returns 400 `invalid_reference`, though the engine supports `unplanned-progress`.

- This is a product decision. If it's intended, say so on the card ("Nothing was planned this week").
- **File:** `apps/api/src/services/checkInService.ts`.

### L5. "Didn't start" duplicates "Done" when `plannedFrom` equals `plannedTo`

For a stored row with no planned work in the week, both chips set the same position.

- **File:** `apps/web/src/features/checkin/progress.ts`, `ProgressAdjuster.tsx`.
- **Fix:** hide the chips, or show "Nothing planned", for that row.

---

## Recommended fix tickets

1. **S2c-01 (M1):** Re-key check-ins and week reviews when the family week start changes (or block the change), with API tests for the re-prompt, the listing and editing the stored week.
2. **S2c-02 (M2):** Reject backwards check-in positions in the API, and match the number field minimum to the slider with an inline error. Make a product call on recording repeated work.
3. **S2c-03 (L1):** Invalid Custom thickness blocks Save in the subject and assignment forms.
4. **S2c-04 (L2):** Don't save a pending or stale weight suggestion; key it on unit and children.
5. **S2c-05 (L3 + L5):** Check-in polish: refresh the picker after a save, and handle rows with no planned work.
6. **Product question (L4):** whether to allow progress in weeks with no planned work.
