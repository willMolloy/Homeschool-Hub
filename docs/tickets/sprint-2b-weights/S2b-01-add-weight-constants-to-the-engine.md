# S2b-01 — Add weight constants to the engine

**Depends on:** none  
**Size:** XS

## Goal
The engine has one home for the weight model (built-in weights, bounds, the minutes normalization and a resolver), with no change to plans yet.

## Context
DeeDee dropped "minutes per unit" for pages, chapters and lessons. Each assignment gets a relative **weight per unit** (effort per page, chapter or lesson). Bar thickness = units per day × weight. Minutes assignments keep thickness = minutes, scaled onto the same axis so mixed lanes compare.
Today `packages/engine/src/units.ts` holds `DEFAULT_MINUTES_PER_UNIT` and `minutesPerUnitOf`. This ticket adds the weight equivalents next to them. Nothing calls them until S2b-02.

## Steps
1. New `packages/engine/src/weights.ts`:
   - `DEFAULT_WEIGHT_PER_UNIT: Readonly<Record<Exclude<UnitType, "minutes">, number>>` = `{ pages: 1, chapters: 10, lessons: 15 }`, frozen.
   - `MINUTES_PER_WEIGHT_POINT = 3`, so a page at weight 1 ≈ 3 minutes and 1 minute = 1/3 point (**decision D1**).
   - `MIN_WEIGHT_PER_UNIT = 0.01`, `MAX_WEIGHT_PER_UNIT = 100`, `WEIGHT_DECIMALS = 2` (**decision D2**). These are the only bounds; the API (S2b-06), the DB CHECK (S2b-03) and the web form (S2b-10) import or mirror them.
   - `type WeightSource = "assignment" | "default" | "minutes"`.
   - `weightPerUnitOf(a: Pick<Assignment, "unitType" | "weightPerUnit">): { weight: number; source: WeightSource }`:
     - `minutes` → `{ weight: 1 / MINUTES_PER_WEIGHT_POINT, source: "minutes" }`, whatever is stored.
     - A finite number in [MIN, MAX] → itself, `"assignment"`.
     - Anything else (null, undefined, NaN, ≤ 0, > MAX) → the built-in for the unit, `"default"`. The engine never throws on a bad weight; the API keeps bad values out.
   - `isValidWeight(n: unknown): n is number`: finite, within the bounds, at most 2 decimals.
2. Add `weightPerUnit?: number | null` to `Assignment` in `types.ts`, documented as "null = built-in default; ignored for minutes". Keep `minutesPerUnit` for now (it is removed in S2b-14).
3. Export everything from `index.ts`.

## Done when
- [ ] `import { DEFAULT_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, weightPerUnitOf } from "@hh/engine"` works from the API and the web.
- [ ] No plan output changes (every existing engine test passes unchanged).

## Tests (`packages/engine/test/weights.test.ts`)
- Built-ins are 1, 10 and 15, and the object is frozen.
- Minutes resolve to 1/3 with source `minutes`, even when a weight is stored.
- A stored 1.4 resolves to 1.4 `assignment`. null, undefined, 0, -1, NaN, Infinity and 101 resolve to the unit default with source `default`.
- `isValidWeight`: 0.01 and 100 are valid; 0, 0.001, 100.01, 1.234, "1" and NaN are not.

## Out of scope
- Using the weight in `planChild` (S2b-02) and per-child learned weights (S2b-08).
