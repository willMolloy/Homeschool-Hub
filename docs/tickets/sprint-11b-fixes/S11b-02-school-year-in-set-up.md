# S11b-02 — A School year screen in Set up
**Finding:** N2 (Medium) · **Size:** M
## Goal
The school year (first and last day, shape, term views) can always be set or changed from Set up, so hiding the Home reminder never loses it.
## Steps
1. Set up gets a "School year" row (with the other setup rows) opening `/setup/school-year`: the dates (DateField), the shape (same cards and preview as step 4, the saved one pre-selected), and a link to edit the term views (the existing zoom-views sheet).
2. It reuses step 4's logic (one shared component), so behaviour matches the flow.
3. The Home checklist's hidden state is stored per family (not per browser), and "Set your school year" stays reachable from Set up regardless.
## Done when
- A parent who hid the reminder sets the year from Set up; a second family on the same browser still sees its own reminders.
## Tests
- Web: the screen saves the same data as step 4; hidden state is per family.
