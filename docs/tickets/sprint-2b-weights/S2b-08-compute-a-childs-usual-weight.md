# S2b-08 — Compute a child's usual weight

**Depends on:** S2b-01, S2b-04  
**Size:** S

## Goal
A pure engine function turns a child's pages or chapters history into a "usual weight" with DeeDee's trimmed-mean rule. A second function resolves the default for a new assignment across children, the subject default and the built-in. The API reads the history with one query.

## Why
A prolific child who chooses light weights ends up with thin bars for 20 pages, and a slower child with thick ones. The defaults follow each child's own trend.

## The rule (D5, decided by DeeDee; the small-count case is D18)
- **Per child and unit type** (pages or chapters only):
  1. Take the **latest weight per assignment**, so an assignment edited five times counts once.
  2. Drop assignments whose latest choice is a clear (NULL).
  3. Keep the **5 most recent** by `chosen_at, id`. Archived assignments count.
  4. Combine them:
     - **5 or 4 values:** drop the single highest and the single lowest, then average the rest: the middle 3 (5 values) or the middle 2 (4 values).
     - **1–3 values:** the plain mean (too few to trim).
     - **0 values:** none (fall back).
  5. Round to 2 decimals, half away from zero.
- **Resolving a new assignment's default** (`suggestWeight`), in DeeDee's precedence:
  1. **Learned:** for pages and chapters, the median of the per-child usual weights of the children who have history (D6). With one child that is just their value.
  2. **Subject default:** if the subject has one for this unit type (S2b-30).
  3. **Built-in.**
  - D19 is open: the learned weight beats the subject default for pages and chapters.
  - Lessons and minutes skip step 1.

## Steps
1. `packages/engine/src/weights.ts`:
   - `usualWeight(choices: { assignmentId: string; weight: number | null; chosenAt: string; id: number }[]): number | null`. Unordered input.
   - `suggestWeight({ unitType, perChild: { childId: string; usual: number | null }[], subjectDefault: { unitType; weightPerUnit } | null }): { weight: number; source: "child" | "children" | "subject" | "builtin"; childIdsWithHistory: string[]; childIdsWithout: string[] }`. Learned is only used when `isLearnedUnit(unitType)`; for other units `perChild` is ignored.
   - Export `TRIM_MIN_COUNT = 4` and `USUAL_WEIGHT_WINDOW = 5`.
2. `apps/api/src/repos/weightChoiceRepo.ts`: `choicesFor(db, familyId, childIds, unitType)`. One query: `DISTINCT ON (child_id, assignment_id)` latest per assignment, then the newest 5 per child with `row_number()`.

## Tests (`packages/engine/test/weights.usual.test.ts`)
- **Trimmed mean:**
  - [1, 1.2, 1.4, 1.6, 9] → 1.4 (drops 1 and 9; mean of 1.2, 1.4, 1.6).
  - [1, 2, 3, 10] → 2.5 (drops 1 and 10).
  - [1, 2, 3] → 2; [1.4] → 1.4.
  - [] → null; all NULL → null.
  - Ties on high or low (for example [2, 2, 2, 2, 5]) → drops only one of each → 2.
  - Six assignments → only the newest 5 count.
  - Edited 3 times → its last value only.
  - A latest choice of NULL removes that assignment.
  - Rounding: [1.005, 1.006, 1.007] → 1.01.
- **`suggestWeight`:**
  - One child → `child`.
  - Two children with 1.4 and 2.0 → 1.7 `children`.
  - One child with history and one without → the first child's value, listing the other.
  - No history + a subject default 3 → 3 `subject`.
  - No history, no subject → built-in.
  - Lessons with a subject default 20 → 20 `subject` (history ignored); minutes with nothing → 0.5 `builtin`.
  - A subject default for a different unit → ignored.
- **Repo:** another family's rows never appear; another unit's rows are ignored.

## Out of scope
- The endpoint (S2b-09).
