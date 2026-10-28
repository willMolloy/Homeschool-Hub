# S2b-09 — Add the weight-suggestion endpoint

**Depends on:** S2b-07, S2b-08  
**Size:** S

## Goal
`GET /api/weights/suggestion?unitType=pages&childIds=<uuid>,<uuid>` returns the default weight the form should start from, and where it came from.

## Contract
- **Query (strict, RF-09 style):**
  - `unitType` is one of pages, chapters or lessons. Minutes or junk → 400 "unitType: weights apply to pages, chapters or lessons."
  - `childIds`: 1–20 comma-separated UUIDs, de-duplicated. Empty, malformed or repeated params → 400.
  - Unknown params → 400.
- **Children (decision D8):** each id must belong to the session family, otherwise 400 `invalid_reference` (no existence leak across families). **Archived children are allowed.** It's a read, the edit form can need it for an assignment that still lists an archived child, and their history is real.
- **Response 200:**
  ```json
  { "unitType": "pages", "weightPerUnit": 1.4, "source": "child",
    "builtInDefault": 1,
    "children": [{ "childId": "…", "name": "Margaret", "usual": 1.4, "choices": 3 }, { "childId": "…", "name": "Frank", "usual": null, "choices": 0 }] }
  ```
  `source` is one of `builtin`, `child` or `children` (from `suggestWeight`). `choices` is the number of assignments that fed the median, capped at 5.

## Steps
1. New `routes/weights.ts`, registered behind the session hook like the other schedule routes. Load the children (family-scoped, including archived), call `choicesFor` then `usualWeight`/`suggestWeight`, and shape the response.
2. Add the query parser to `http/validate.ts`, beside `parseListQuery`.

## Done when
- [ ] The web can call it for 1..n children and render the hint from the response alone.

## Tests (`apps/api/test/weights-suggestion.test.ts`)
- A child with no history → the built-in default and `builtin` (each unit type).
- Choices 1.2, 1.4 and 1.6 → 1.4 with `child` and `choices: 3`.
- Two children → the combined rule from S2b-08.
- An archived child with history → still used.
- A foreign child id → 400 `invalid_reference`; a malformed id → 400; minutes → 400; `unitType` missing → 400; an extra param → 400.
- Signed out → 401.
- A plan request is unaffected (the endpoint writes nothing).

## Out of scope
- Caching; it's a single indexed query.
