# S10-07 — Add assignment without browser-default controls
**Source:** UX review improvement 5; mockup frame 5 · **Depends on:** S10-06 · **Size:** M

## Goal
Add assignment uses only the app's own controls (subject picker, child chips, date tiles and soft day chips) and saves exactly what it saves today.

## Context
- Today the form uses a native select, checkboxes, date inputs and solid green day chips.

## Steps
1. Subject: a picker sheet that lists each subject's badge and name, ticks the current one, and puts "New subject…" last (it creates the subject on save, as today).
2. Children: toggle chips.
3. Dates: date tiles (the shared `DateField`).
4. Days: soft day chips instead of solid green.

## Done when
- At 360 px, in light and dark, adding an assignment uses only these controls.
- The saved data is unchanged.
- Only what's essential.

## Tests
- Web:
  - the picker selects a subject and creates a new one;
  - the chips toggle;
  - the saved body is the same as today's.

## Out of scope
- Subject colours (S10-11) and the Add several and CSV import forms.
