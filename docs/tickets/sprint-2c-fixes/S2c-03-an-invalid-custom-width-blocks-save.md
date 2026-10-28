# S2c-03 — An invalid Custom width blocks Save

**Finding:** L1  
**Depends on:** none  
**Size:** S

## Goal
When the thickness picker's Custom field is empty or invalid, the subject form and the assignment form can't save. Today they quietly save the last valid value.

## Context
- `ThicknessPicker` shows "Enter a weight." (or a range error), but it doesn't call `onChange`, so the parent form still holds the old value.
- The picker is used in:
  - `features/roster/DefaultWeightSection.tsx`, inside `SubjectForm`;
  - the assignment form, if it uses the picker. The tester named it. Check, and cover it there too.

## Steps
1. `ThicknessPicker` gains an optional `onValidityChange(valid: boolean)`.
   - It reports `false` while Custom is open with an invalid entry.
   - It reports `true` once the entry is valid, or another preset is chosen.
2. `DefaultWeightSection` passes it up. `SubjectForm` blocks submit while it's invalid:
   - Save is disabled, and the section's error stays visible.
   - Pressing Enter does nothing.
3. Do the same in the assignment form wherever a picker or Custom-style weight field can be invalid.
   - The weight field there (S2b-10) already blocks a bad number. Check this and add a test.
4. While invalid, the preview caption says "Enter a weight to see the preview" instead of showing the old value.

## Done when
- [ ] Subject form, with Custom cleared: Save is disabled, and no PATCH is sent.
- [ ] Typing a valid weight enables Save again, and the PATCH sends that weight.
- [ ] Choosing a preset after an invalid Custom entry enables Save.
- [ ] The assignment form can't save an invalid weight either.

## Tests
- `apps/web/test/thickness-picker.test.tsx`: `onValidityChange` sequence; the caption while invalid.
- `apps/web/test/subject-default-weight.test.tsx`: cleared Custom → Save disabled, no request; valid again → saves.
- The assignment form: an invalid weight → no request.

## Out of scope
- New validation rules: the bounds stay 0.01–100, to 2 decimals.
