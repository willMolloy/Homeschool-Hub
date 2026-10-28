# S1-26 — Add the add-child form

**Depends on:** S1-23, S1-25  
**Size:** S

## Goal
On `/kids` a parent can add a child with a name and optional color, and it appears in the list right away.

## Context
Uses `POST /api/children`. Keep it one small inline form or a bottom sheet on phones. No separate page.

## Steps
1. 'Add' button opens an inline form: Name (required, autofocus), Color (a row of 8 preset swatches; default the next unused one).
2. Submit → `apiPost`; on success append to the list and close the form. On 400/409 show the message under the field.
3. Enter submits, Escape cancels.
4. Button disabled while saving.

## Done when
- [x] Adding a child works at 360 px and with keyboard only.

## Tests
- render tests: success appends; validation error shown; escape closes

## Out of scope
- Custom color picker.
