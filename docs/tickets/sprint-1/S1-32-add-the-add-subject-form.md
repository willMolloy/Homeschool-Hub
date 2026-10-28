# S1-32 — Add the add-subject form

**Depends on:** S1-29, S1-31  
**Size:** S

## Goal
On `/subjects` a parent can add a subject with a name and optional color, and it appears in the list right away.

## Context
Uses `POST /api/subjects`. Keep it one small inline form or a bottom sheet on phones. No separate page.

## Steps
1. 'Add' button opens an inline form: Name (required, autofocus), Color (a row of 8 preset swatches; default the next unused one).
2. Submit → `apiPost`; on success append to the list and close the form. On 400/409 show the message under the field.
3. Enter submits, Escape cancels.
4. Button disabled while saving.

## Done when
- [ ] Adding a subject works at 360 px and with keyboard only.

## Tests
- render tests: success appends; validation error shown; escape closes
- 409 shows 'You already have a subject with that name.'

## Out of scope
- Custom color picker.
