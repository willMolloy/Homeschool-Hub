# S1-11 — Add a seed script for the sample family

**Depends on:** S1-08, S1-09, S1-10  
**Size:** S

## Goal
`npm run db:seed` loads the prototype's sample family (Frank, Margaret, 5 subjects, 14 assignments, 3 events, Christmas break) into the local DB.

## Context
Every screen built after this needs realistic data. The sample family already exists in engine form at `packages/engine/test/fixtures/sample-family.ts`, and the engine's tests prove its numbers (for example, Treasure Island is 90 pages in the week of Oct 26). Seeding the same data lets you compare the API's output with the tests.

## Steps
1. Create `db/seed.ts` (tsx). Refuse to run unless the DB name ends in `_dev`.
2. Inside one transaction: delete the family with login_email `demo@example.com` if present (cascade), then insert family (week_start `mon`, school_days `{1,2,3,4,5}`, login_email `demo@example.com`, password_hash from S1-10's `hashPassword('demo-password')`).
3. Insert children, subjects (Literature, Math, History, Science, Music), assignments + assignment_child rows, events + event_child + event_subject_rule, and blocked_range for Dec 21–Jan 1, mapping from `sample-family.ts`. Generate uuids in SQL (`gen_random_uuid()`) and keep a JS map from fixture id → uuid.
4. Print a summary: counts per table and the demo login.
5. Add root script `"db:seed": "tsx db/seed.ts"`.

## Done when
- [x] Seed runs twice without errors or duplicates.
- [x] Row counts: 2 children, 5 subjects, 14 assignments, 16 assignment_child rows, 3 events, 1 blocked range.

## Tests
- Integration test: seed then count rows as above

## Out of scope
- Production seed data.
