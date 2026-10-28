# S2b-09 — Add the weight-suggestion endpoint

**Depends on:** S2b-07, S2b-08, S2b-31  
**Size:** S

## Goal
`GET /api/weights/suggestion?unitType=pages&childIds=<uuid>,<uuid>&subjectId=<uuid>` returns the default weight the form should start from, and where it came from. It follows the precedence learned (pages and chapters) → subject → built-in.

## Contract
- **Query (strict):**
  - `unitType` is any `UNIT_TYPES` value; junk → 400.
  - `childIds`: 0–20 comma-separated UUIDs, de-duplicated. Malformed or repeated → 400. Zero children is allowed (the form before a child is picked).
  - `subjectId` is optional; malformed → 400.
  - Unknown params → 400.
- **References (D8):** children and the subject must belong to the session family, otherwise 400 `invalid_reference`. Archived children and archived subjects are allowed: it's a read, and the edit flow can need them.
- **Response 200:**
  ```json
  { "unitType": "pages", "weightPerUnit": 1.4, "source": "child", "builtInDefault": 1,
    "subjectDefault": { "unitType": "pages", "weightPerUnit": 2 },
    "learned": true,
    "children": [{ "childId": "…", "name": "Margaret", "usual": 1.4, "choices": 5 }, { "childId": "…", "name": "Frank", "usual": null, "choices": 0 }] }
  ```
  - `source` is one of child, children, subject or builtin.
  - `learned` is false for lessons and minutes, and `children[].usual` is then null.
  - `subjectDefault` is null when the subject has none.
  - `choices` is the count used (≤ 5).

## Steps
1. `routes/weights.ts`, registered behind the session hook. A thin route; the logic lives in a `services/weightSuggestionService.ts` (load the children and the subject, `choicesFor` → `usualWeight` → `suggestWeight`), so it is unit-testable.
2. Add the query parser to `http/validate.ts`.

## Tests (`apps/api/test/weights-suggestion.test.ts`)
- **No history:** built-in for each unit type (1, 10, 15, 0.5).
- **History** 1, 1.2, 1.4, 1.6, 9 → 1.4 `child`.
- Two children → the median of their usual weights.
- **Subject default** pages 2:
  - No history → 2 `subject`.
  - With history → the learned value wins (D19).
- Lessons with history rows faked in the DB → ignored (`learned: false`), giving the subject default or built-in.
- Archived child or archived subject → used.
- A foreign child or subject → 400 `invalid_reference`; malformed → 400; an extra param → 400; 401.
- It writes nothing.
