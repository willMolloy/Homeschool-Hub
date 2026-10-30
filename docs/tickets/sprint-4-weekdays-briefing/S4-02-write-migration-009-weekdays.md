# S4-02 — Write migration 009: assignment and subject weekdays

**Source:** ROADMAP.md, "Assignment weekdays"  
**Depends on:** none  
**Size:** S

## Goal
The database can store an assignment's own weekdays and a subject's default weekdays.

## Context
- `family.school_days` is a `smallint[]` with a CHECK for 0–6 and no NULLs (`001_init.sql`); reuse that rule.
- Migrations run with `db/migrate.ts`; `db/test/validate.sql` checks the schema.

## Steps
1. Add `db/009_weekdays.sql`: `assignment.weekdays smallint[] NULL` and `subject.default_weekdays smallint[] NULL`, each with a CHECK: NULL, or a non-empty array of distinct values in 0–6 with no NULLs.
2. Existing rows get NULL (no change in behaviour).
3. Extend `validate.sql` for the new columns and checks.

## Done when
- The migration applies to an empty database and to one with data; existing rows read NULL.
- Bad values (7, -1, an empty array, a NULL element, duplicates) are rejected.

## Tests
- `db/test/`: a migration test in the style of the existing ones (`checkin-migration.test.ts`), covering the cases above. `npm run db:validate` passes.

## Out of scope
- API and engine changes.
