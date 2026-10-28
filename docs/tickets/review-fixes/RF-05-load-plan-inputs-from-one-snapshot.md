# RF-05 — Load plan inputs from one snapshot

**Depends on:** none  
**Size:** S  
**Review refs:** developer M2, tester M-1

## Goal
One `/api/plan` request reads all of its rows on a single connection inside `BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ`.

## Context
`loadPlanInputs` fires 11 queries with `Promise.all` on a pool of 10, so one request can take every connection, and the rows can come from different moments (a concurrent edit can be half-seen).

## Steps
1. `db.ts`: `withReadSnapshot(pool, fn)` checks out one client, runs `BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ`, then `fn(client)`, then COMMIT (ROLLBACK on error), and always releases.
2. `loadPlanInputs(db, familyId)` takes a pool and runs its queries one after another inside the snapshot. The family's time zone is read in the same snapshot, so the route no longer needs its own query, and "family gone" is decided once.
3. The route maps `FamilyNotFoundError` to the existing 401.

## Done when
- [x] One plan request checks out exactly one connection and never uses `pool.query` directly.
- [x] Plan output is unchanged (contract tests green).

## Tests
- Wrap the test pool so `connect()` and `query()` are counted: one `GET /api/plan` → `connect` 1, pool-level `query` 0 for the plan's reads (the session check is separate and allowed).
- `withReadSnapshot`: a write inside is rejected (read-only), it rolls back and releases on a thrown error, and two reads see the same snapshot while another connection commits in between.
- Family deleted → 401 as before.

## Out of scope
- Computing only the requested range (developer L11).
