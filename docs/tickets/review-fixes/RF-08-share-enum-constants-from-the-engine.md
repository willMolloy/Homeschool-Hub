# RF-08 — Share enum constants from the engine

**Depends on:** none  
**Size:** S  
**Review refs:** developer M4 (tester M-5 notes the same lists)

## Goal
Unit types, event (subject) rules, override modes and blocked-range kinds are each defined once, as `as const` arrays in `@hh/engine`, and the API, the web and a db test all use them.

## Context
The same lists are typed by hand in the engine types, the zod enums, the web label maps and the SQL CHECK constraints. Adding a unit type means editing five files and hoping.

## Steps
1. `packages/engine/src/enums.ts`: `UNIT_TYPES`, `SUBJECT_RULES`, `OVERRIDE_MODES`, `BLOCKED_KINDS`, with `UnitType`, `SubjectRule`, `OverrideMode`, `BlockedKind` derived from them (the existing type names keep working). Add `isUnitType` and similar guards only where something needs them.
2. API: the zod enums use `z.enum(UNIT_TYPES)` and so on, with messages built from the arrays. Repos import the types from the engine.
3. Web: `api/types.ts` re-exports the engine types. Label maps are typed `Record<UnitType, string>` (already a compile error if one is missing), and option lists iterate the engine arrays.
4. db test: read `pg_get_constraintdef` for `assignment.unit_type`, `event.default_rule`, `event_subject_rule.rule`, `week_override.mode` and `blocked_range.kind`, parse the quoted values and compare them with the engine arrays as sets.

## Done when
- [ ] Each list is written once in TypeScript (plus once in SQL, guarded by the test).
- [ ] API messages and web options are unchanged.

## Tests
- db: the five CHECK constraints match the engine constants (and the test fails if either side gains a value).
- engine: the arrays are frozen and have no duplicates.
- Existing API validation and web form tests stay green.

## Out of scope
- Generating SQL from TS, a shared contracts package (tester M-2 / developer M5).
