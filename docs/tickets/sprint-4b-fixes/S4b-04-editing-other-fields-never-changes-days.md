# S4b-04 — Editing other fields never changes an assignment's days

**Finding:** L1  
**Depends on:** none  
**Size:** XS

## Goal
Saving an assignment without touching its day chips never changes its stored `weekdays`.

## Context
- On edit, an assignment whose own list equals the subject default is saved as `weekdays: null`, so a title-only edit silently makes it follow the subject (S4-07 decision).

## Steps
1. On edit, send `weekdays` only if the parent tapped a chip. If they did, keep S4-07's rule (equal to what it would inherit → null).
2. Adding is unchanged.

## Done when
- A title-only edit sends no `weekdays`; tapping a chip still sends the list (or null when it matches the inherited days).

## Tests
- Web: the two cases above.

## Out of scope
- Changing how adding works.
