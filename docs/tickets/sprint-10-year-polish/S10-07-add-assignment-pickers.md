# S10-07 — Add assignment: subject picker, child chips, soft day chips
**Source:** UX review improvement 5; mockup frame 5 · **Size:** M
## Goal
No browser-default dropdowns or checkboxes on Add assignment.
## Steps
1. Subject: a picker sheet listing badge + name, a tick on the current one, "New subject…" last (creates on save, as today).
2. Children: toggle chips.
3. Dates: date tiles (shared DateField).
4. Days: soft day chips instead of solid green.
## Done when
- Adding an assignment at 360 px uses only these controls, in light and dark; behaviour is unchanged (same saved data).
## Tests
- Web: picker selects and creates; chips toggle; saved body unchanged from today.
