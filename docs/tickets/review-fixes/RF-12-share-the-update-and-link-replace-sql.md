# RF-12 — Share the update and link-replace SQL

**Depends on:** RF-11  
**Size:** S  
**Review refs:** developer M6, tester M-4

## Goal
One `buildUpdateSet` helper and one `replaceLinks` helper replace the four hand-written dynamic UPDATE builders and the three "delete links, insert links" copies.

## Context
`rosterRepo`, `assignmentRepo`, `eventRepo` and `blockedRangeRepo` each build `SET col = $n` lists by hand. The child-link replacement is copied three times, and the assignment copy lacks the empty-list guard.

## Steps
1. `repos/sql.ts`:
   - `buildUpdateSet(cols, { archived?, firstParam })` → `{ sets, params }`. It skips `undefined` and keeps `null`, adds the `archived_at` COALESCE/NULL rule, and always adds `updated_at = now()`. Column names come from a typed record of constants, never from input.
   - `replaceLinks(tx, { table, ownerCol, ownerId, familyId, childIds })` takes a closed union of link tables.
2. Use them in the four repos. The SQL text and results stay equivalent.

## Done when
- [x] No repo builds `SET` lists by hand, and there is one link-replace implementation.
- [x] All API tests green, with no behavior change.

## Tests
- `buildUpdateSet`: skips undefined, keeps null, numbers params from `firstParam`, archived true/false/absent, and an empty patch still sets updated_at.
- `replaceLinks`: replaces, empties with `[]`, and leaves other owners' links alone.
- Existing repo and route tests unchanged.

## Out of scope
- A query builder or ORM (tester: don't).
