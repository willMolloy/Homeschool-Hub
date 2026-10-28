# S2b-08 — Compute a child's usual weight

**Depends on:** S2b-01, S2b-04  
**Size:** S

## Goal
A pure engine function turns a child's choice history into a "usual weight", and a second one combines several children. The API reads the history with one query.

## The rule (decisions D5, D6)
- **Per child and unit type:**
  - Take the **latest choice per assignment** (one assignment fiddled five times counts once).
  - Drop assignments whose latest choice is a clear (NULL).
  - Keep the **5 most recent** of those by `chosen_at, id`.
  - Return their **median**: an even count takes the mean of the middle two. Round to 2 decimals, half away from zero.
  - No choices → none.
  - Choices from archived assignments count: a finished book is still good history.
- **Several children (multi-child assignment):**
  - Take the median of the per-child usual weights of the children who **have** history.
  - If none of them has history → the built-in default.
  - Children without history are listed as such so the hint can say so.

## Steps
1. `packages/engine/src/weights.ts`:
   - `usualWeight(choices: { assignmentId: string; weight: number | null; chosenAt: string }[]): number | null`. The input is unordered; the function sorts it.
   - `suggestWeight(unitType, perChild: { childId: string; usual: number | null }[]): { weight: number; source: "builtin" | "child" | "children"; childIdsWithHistory: string[]; childIdsWithout: string[] }`.
   - A minutes unit type throws `EngineInputError` (no weights).
2. `apps/api/src/repos/weightChoiceRepo.ts`: `choicesFor(db: Queryable, familyId, childIds, unitType)` returns the rows grouped per child. Use one query with `DISTINCT ON (child_id, assignment_id) … ORDER BY child_id, assignment_id, chosen_at DESC, id DESC`, then cap at 5 per child in SQL with a window, or in TS.

## Done when
- [ ] The engine functions are pure, exported and fully tested; the repo query is tested against a DB.

## Tests
- Engine (`weights.usual.test.ts`):
  - [1.4] → 1.4.
  - [1, 2] → 1.5.
  - [1, 1, 9] → 1 (the median resists one outlier).
  - Six choices → only the newest 5 count.
  - The same assignment edited 3 times → only its last value counts.
  - A latest choice of NULL removes that assignment.
  - All NULL → null; an empty list → null.
  - Ties on `chosenAt` are broken by input id order, stably.
  - Rounding: [1.005, 1.006] → 1.01.
- Engine (`suggestWeight`):
  - One child with history → `child`.
  - Two children, both with history (1.4, 2.0) → 1.7, `children`.
  - One with history, one without → the first child's value, and `childIdsWithout` has the other.
  - None → built-in (pages 1, chapters 10, lessons 15) with `builtin`.
  - Minutes → throws.
- Repo: choices from another family never appear, and another unit type's choices are ignored.

## Out of scope
- The endpoint (S2b-09).
