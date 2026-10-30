# S4-04 — Accept and return weekdays on the assignment endpoints

**Source:** ROADMAP.md, "Assignment weekdays"  
**Depends on:** S4-02  
**Size:** S

## Goal
The assignment endpoints (single, patch and bulk) accept and return `weekdays`.

## Context
- `routes/assignments.ts`: `CreateBody`, `PatchBody` and the bulk route (S3a-03) share the create logic.

## Steps
1. `weekdays: number[] | null` (optional) on create, patch and each bulk item: 1–7 distinct integers 0–6. `null` (or leaving it out on create) means "follow the subject".
2. Assignment JSON includes `weekdays` (sorted, or null).

## Done when
- Single and bulk creates store it; patch sets and clears it; invalid values are 400 (bulk names the item, as today).

## Tests
- API integration: create with Fridays only; bulk with one item set and one null; patch to null; invalid values → 400.

## Out of scope
- The assignment form (S4-07); CSV import keeps following the subject (no CSV column).
