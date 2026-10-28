# S2c-04 — Don't save a loading or stale weight suggestion

**Finding:** L2  
**Depends on:** none  
**Size:** S

## Goal
The assignment form never saves a weight that came from a suggestion that is still loading, or that was made for different inputs.

## Context
- `useWeightSuggestion` returns the last answer for the same unit while a newer one loads, so the field doesn't flicker.
- So after the selected children change, a quick Save stores the previous children's learned weight.
- While the first answer is in flight it returns null, and Save stores `weightPerUnit: null`. The learned default is lost.

## Steps
1. `useWeightSuggestion` returns `{ suggestion, pending }`:
   - `suggestion`: the last answer for the same unit, as now, so the display doesn't change;
   - `pending`: true while the answer for the *current* (unit, sorted children, subject) isn't in yet, debounce included.
2. In the assignment form, while following the suggestion (nothing typed) and `pending`:
   - the Save button is disabled, with `aria-busy`, and keeps the label "Save";
   - submit (Enter) does nothing.
   - A typed weight doesn't depend on the suggestion, so it can save at any time.
3. A failed request already resolves to the built-in, so the form is never stuck.

## Done when
- [ ] Add form: Save is disabled until the suggestion for the current inputs arrives.
- [ ] Changing the children disables Save until the new answer arrives, and the saved weight is the new answer.
- [ ] Typing a weight enables Save at once.
- [ ] A failed suggestion request enables Save with the built-in.

## Tests
- `apps/web/test`, the weight-suggestion hook: `pending` per input change.
- Assignment form:
  - Save disabled while pending;
  - children change → the new suggestion is sent, not the old one;
  - a typed value saves while pending.

## Out of scope
- Changing how suggestions are computed.
