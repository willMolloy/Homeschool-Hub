# S2b-11 — Prefill the weight and show its source

**Depends on:** S2b-09, S2b-10  
**Size:** S

## Goal
When the parent adds an assignment, the weight field starts from the suggestion (learned → subject → built-in), a hint says where it came from, and the parent can override it or go back.

## Behaviour
- **Fetching:** call `GET /api/weights/suggestion` with the unit type, the selected children and the subject. Call again when any of them changes (debounced about 250 ms; stale responses are ignored).
- **Prefill** only while the field is untouched; never overwrite typed input.
- **Hint:**
  - `child`: "Using Margaret's usual weight for pages (1.4)."
  - `children`: "Using Margaret and Frank's usual weight (1.7)."
  - Mixed: "Using Margaret's usual weight (1.4). Frank has no history yet."
  - `subject`: "Using the Math default (20 per lesson)."
  - `builtin`: "Using the default weight for pages (1)."
  - After an override: "Your weight (2). Margaret's usual is 1.4." (or "The Math default is 20."), with a **Use 1.4** button.
- **What gets sent:**
  - A **learned** value is sent explicitly, so later learning doesn't move this assignment's bars.
  - **Subject** and **built-in** sources with an untouched field send `null`, so the assignment follows the subject's default live (D20).
  - Any typed value is sent explicitly.
- **Edit:**
  - Show the stored weight, with no prefill.
  - A unit change resets the field to the new unit's suggestion, with the hint.
  - A null stored weight shows a placeholder with the current effective value ("2 from Math").
- If the suggestion request fails, fall back silently to the built-in hint; never block the form.
- Numbers are shown without trailing zeros.

## Steps
1. A `useWeightSuggestion(unitType, childIds, subjectId)` hook.
2. A pure `WeightHint` component.
3. Wire both into `AssignmentForm`, and add a fake-api handler.

## Tests
- `weight-hint.test.tsx`: every source and the override text.
- `assignments-screen.test.tsx`:
  - Margaret + pages → 1.4 pre-filled and sent.
  - Add Frank → the mixed hint.
  - Typing 2 holds across child changes.
  - **Use** restores the suggestion.
  - Math (lessons, subject 20) → the hint shows 20 and `null` is sent.
  - Built-in → null.
  - A suggestion error → the built-in hint, and save still works.
  - Edit makes no request until the unit changes.

## Out of scope
- A history list.
