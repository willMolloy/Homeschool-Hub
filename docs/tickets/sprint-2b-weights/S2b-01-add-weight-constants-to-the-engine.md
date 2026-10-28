# S2b-01 — Add weight constants to the engine

**Depends on:** none  
**Size:** XS

## Goal
The engine has one home for the weight model: built-in weights, bounds, the minutes scale, the learned-unit list and a resolver. Plans don't change yet.

## Context
DeeDee dropped "minutes per unit". Each assignment gets a relative **weight per unit** (effort per page, chapter, lesson or minute), and bar thickness = units per day × weight.
DeeDee decided (Oct 28) that **2 minutes = 1 point**, so a page at weight 1 is about 2 minutes (**D1**).
Weights can come from four places (S2b-11, S2b-32):
1. The assignment's own value
2. The child's learned weight (pages and chapters only)
3. The subject's default
4. The built-in

`packages/engine/src/units.ts` holds `DEFAULT_MINUTES_PER_UNIT` and `minutesPerUnitOf` today. They stay until S2b-14.

## Steps
1. New `packages/engine/src/weights.ts`:
   - `MINUTES_PER_WEIGHT_POINT = 2`.
   - `DEFAULT_WEIGHT_PER_UNIT: Readonly<Record<UnitType, number>>` = `{ pages: 1, chapters: 10, lessons: 15, minutes: 1 / MINUTES_PER_WEIGHT_POINT /* 0.5 */ }`, frozen. Minutes can carry a weight (an explicit one, or the subject default, **D21**). The default keeps 30 minutes = 15 points = 30 pages' worth of time at weight 1.
   - `LEARNED_UNIT_TYPES = ["pages", "chapters"] as const`. These are objective, count-based units where a child's history means something (**D17**: chapters are included, flagged as a decision).
   - `MIN_WEIGHT_PER_UNIT = 0.01`, `MAX_WEIGHT_PER_UNIT = 100`, `WEIGHT_DECIMALS = 2` (**D2**). These are the single source; the API (S2b-06, S2b-31), the DB CHECKs (S2b-03, S2b-30) and the web (S2b-10, S2b-34) mirror or import them.
   - `type WeightSource = "assignment" | "subject" | "default"`.
   - `weightPerUnitOf(a: Pick<Assignment, "unitType" | "weightPerUnit">, subjectDefault?: { unitType: UnitType; weightPerUnit: number } | null): { weight: number; source: WeightSource }`:
     - A valid `a.weightPerUnit` → `"assignment"`.
     - Otherwise a valid subject default whose `unitType` matches → `"subject"`.
     - Otherwise the built-in → `"default"`.
     - It never throws on bad stored values; the API keeps them out.
   - `isValidWeight(n: unknown): n is number`: finite, within the bounds, at most 2 decimals.
   - `isLearnedUnit(u: UnitType): boolean`.
2. Add `weightPerUnit?: number | null` to `Assignment` in `types.ts`, documented as "null = subject default, then built-in". Keep `minutesPerUnit` until S2b-14.
3. Export everything from `index.ts`.

## Done when
- [ ] The API and web can import the constants and the resolver from `@hh/engine`.
- [ ] No plan output changes (all existing engine tests pass unchanged).

## Tests (`packages/engine/test/weights.test.ts`)
- Built-ins are 1, 10, 15 and 0.5, and the object is frozen; `MINUTES_PER_WEIGHT_POINT === 2`.
- **Precedence:** assignment 1.4 beats a subject 3; a null assignment with a matching subject (pages 3) → 3 `subject`; a subject for a different unit type is ignored → built-in; nothing set → built-in.
- **Invalid stored values** fall through to the next level: 0, -1, NaN, Infinity and 101, on both the assignment and the subject.
- `isValidWeight`: 0.01 and 100 are valid; 0, 0.001, 100.01, 1.234, "1" and NaN are not.
- `isLearnedUnit`: pages and chapters → true; lessons and minutes → false.

## Out of scope
- Using weights in `planChild` (S2b-02), subject defaults in plans (S2b-32), and learned weights (S2b-08).
