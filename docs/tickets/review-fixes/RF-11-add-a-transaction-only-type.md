# RF-11 — Add a transaction-only type

**Depends on:** RF-05  
**Size:** S  
**Review refs:** developer M3, tester L-5

## Goal
Repo functions that run several statements take a `Tx` (a client inside `withTransaction`), so calling them with the pool is a compile error, and `rosterRepo` no longer duck-types pool vs client.

## Context
"Call inside a transaction" is a comment on `createAssignment`, `updateEvent` and others. `rosterRepo.create` checks for `release` to decide whether to open its own transaction.

## Steps
1. `db.ts`: `export type Tx = pg.PoolClient & { readonly __tx: unique symbol }`. Only `withTransaction` (and `withReadSnapshot`, as a read-only `Tx`-like type) produce it.
2. Multi-statement repo functions (`create*`/`update*`/`lock*` for assignments, events, blocked ranges, plus roster `create`) take `Tx`. Single reads stay `Queryable`.
3. `rosterRepo.create(tx, …)`: routes wrap the call in `withTransaction`. Remove `isPool`.

## Done when
- [x] `rg isPool apps/api` finds nothing.
- [x] Passing `app.db` to `createAssignment` fails typecheck.

## Tests
- A type test (`// @ts-expect-error` with the pool) in the typecheck build.
- Existing concurrent-create sort-order tests stay green.

## Out of scope
- A unit-of-work abstraction or repository classes.
