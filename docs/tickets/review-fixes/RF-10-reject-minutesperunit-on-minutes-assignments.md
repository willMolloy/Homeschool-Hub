# RF-10 — Reject minutesPerUnit on minutes assignments

**Depends on:** RF-09  
**Size:** S  
**Review refs:** tester M-6

## Goal
An assignment whose unit is `minutes` can't carry a `minutesPerUnit`: the API answers 400, and the database enforces it.

## Context
The engine always uses 1 minute per unit for `minutes` (a unit *is* a minute), but the API accepted and stored any value and the plan ignored it. The spec lets parents override minutes per unit for pages, chapters and lessons ("estimated until the parent sets their own"). The assignment form already hides the field for the minutes unit, so there is no parent-facing override to honor. Decision: **reject**, not honor.

## Steps
1. POST: `unitType: "minutes"` with a non-null `minutesPerUnit` → 400 `invalid_request` ("minutesPerUnit: doesn't apply to minutes; leave it empty").
2. PATCH: check the merged row. Switching to `minutes` while a value is stored needs `minutesPerUnit: null` in the same request, otherwise 400. Setting a value on a minutes row → 400.
3. Web: when the edit form switches the unit to minutes and the row has a value, it sends `minutesPerUnit: null` (the field is hidden).
4. Migration `003_minutes_unit.sql`: clear any stored value on minutes rows, then add `CHECK (unit_type <> 'minutes' OR minutes_per_unit IS NULL)`. Extend `validate.sql`.

## Done when
- [ ] No path can store a `minutesPerUnit` on a minutes assignment.
- [ ] Plans don't change (the engine already ignored it).

## Tests
- API: POST minutes + 30 → 400, minutes + null → 201; PATCH set a value on a minutes row → 400; PATCH pages→minutes with a stored value → 400, with `minutesPerUnit: null` → 200; minutes→pages with a value → 200.
- db: inserting minutes + a value violates the CHECK; the migration clears existing values (validate.sql).
- Web: switching a pages assignment with a custom value to minutes sends `unitType` + `minutesPerUnit: null`.

## Out of scope
- Per-assignment minutes for the minutes unit (not in the spec).
