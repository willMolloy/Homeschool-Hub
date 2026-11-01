# S7-02 — Copy assignments to another child

**Source:** ROADMAP.md, "Year rollover and sibling reuse"  
**Depends on:** S7-01  
**Size:** S

## Goal
A parent copies a set of one child's assignments to another child (for example a younger sibling), optionally shifting the dates.

## Steps
1. Add **Copy to another child**: pick the source child, optionally filter by subject, tick assignments (all by default), pick the target child, and optionally a new start date for the first assignment (all others keep their offset).
2. Copies keep the plan fields as S7-01 and have only the target child. Reuse S7-01's chunked bulk save and preview.

## Done when
- Copying a child's History to a sibling creates History assignments for the sibling only; the originals are unchanged.

## Tests
- Web: source and subject filtering; target-only children; the optional shift; reuse of the chunked save.

## Out of scope
- Moving (not copying) assignments.
