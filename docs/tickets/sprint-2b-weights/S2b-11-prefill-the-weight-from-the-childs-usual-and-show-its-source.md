# S2b-11 — Prefill the weight from the child's usual and show its source

**Depends on:** S2b-09, S2b-10  
**Size:** S

## Goal
When adding an assignment, the weight field starts at the selected children's usual weight, a hint says where it came from, and the parent can override it or go back to it.

## Behaviour
- Ask `GET /api/weights/suggestion` when the unit type (not minutes) and at least one child are selected. Ask again when either changes, debounced about 250 ms, and ignore stale responses.
- **Prefill** only while the parent hasn't typed in the field ("untouched"). Once they type, never overwrite it.
- **Hint** under the field, from the response:
  - `child`: "Using Margaret's usual weight (1.4)."
  - `children`: "Using Margaret and Frank's usual weight (1.7)."
  - Mixed: "Using Margaret's usual weight (1.4). Frank has no history yet."
  - `builtin`: "Using the default weight for pages (1)."
  - After an override: "Your weight (2). Margaret's usual is 1.4." followed by a **Use 1.4** button that refills the field.
- The value is sent explicitly when it came from history (the assignment must not move later when the usual changes). With `builtin` and an untouched field, send `null`.
- **Edit:** the form shows the stored weight and **doesn't prefill**. A unit change on edit resets the field to the new unit's suggestion for the assignment's children (D7) and shows the hint.
- If the suggestion request fails, fall back silently to the built-in hint; never block the form.
- Numbers are shown without trailing zeros (1.40 → "1.4").

## Steps
1. A `useWeightSuggestion(unitType, childIds)` hook in `features/schedule/`.
2. A `WeightHint` component, pure text from props, so it can be tested on its own.
3. Wire it into `AssignmentForm`.
4. Add a fake-api handler in `test/helpers/schedule-fixtures.ts`.

## Done when
- [ ] The hint text matches the examples above for each source, and the field never overwrites typed input.

## Tests
- `weight-hint.test.tsx`: each source and the override text, plus number formatting.
- `assignments-screen.test.tsx`:
  - Pick Margaret + pages → the field shows 1.4 and the hint, and saving sends 1.4.
  - Add Frank → the hint changes to the mixed text.
  - Type 2 → the hint shows the override text; pick another child → it stays 2.
  - **Use 1.4** → 1.4.
  - Built-in → sends null.
  - Suggestion 500 → built-in hint, and save still works.
  - Edit shows the stored value and makes no suggestion request until the unit changes.

## Out of scope
- Showing history details (a list of past choices).
