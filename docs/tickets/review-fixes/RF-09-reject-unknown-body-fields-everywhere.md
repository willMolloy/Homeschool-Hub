# RF-09 — Reject unknown body fields everywhere

**Depends on:** RF-08  
**Size:** S  
**Review refs:** tester M-5

## Goal
Every JSON body schema is strict (an unknown key → 400 `invalid_request`, like `PATCH /api/family`), and boolean query params accept only `true` or `false` (anything else → 400).

## Context
`PATCH /api/family` rejects unknown keys, but every other body silently drops them, so a typo such as `colour` is a no-op that returns 200. `?includeArchived=yes` is silently treated as false.

## Steps
1. `http/validate.ts`: a `BoolQuery` helper. The four list routes parse their query with a strict `ListQuery` and send a 400 on junk or on a repeated param (`?includeArchived=true&includeArchived=false`).
2. Every create and patch body uses `z.strictObject` (children, subjects, assignments, events, blocked ranges, login). The "Send at least one field" refines stay.
3. Make sure the web never sends extra keys. Fix any form that does, and add a fake-api check that fails a test if a body has a key the API doesn't accept.
4. Update the tests that asserted "unknown keys are dropped" to assert 400 and that nothing was written.

## Done when
- [ ] Every POST/PATCH route answers 400 to `{ ...valid, family_id: … }`, naming the key.
- [ ] `?includeArchived=yes`, `=1` and `=TRUE` → 400; `true`, `false` and absent work as before.

## Tests
- A table test over every POST/PATCH route: an extra key → 400, and the row count is unchanged.
- A table test over every list route: junk boolean → 400.
- Web: the existing form tests pass against the stricter fake API.

## Out of scope
- A machine-readable `field` in error bodies (tester M-3).
