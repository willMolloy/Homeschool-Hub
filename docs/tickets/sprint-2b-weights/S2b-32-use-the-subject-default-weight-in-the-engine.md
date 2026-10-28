# S2b-32 — Use the subject default weight in the engine

**Depends on:** S2b-02, S2b-01  
**Size:** XS

## Goal
`planChild` resolves weights with the subject default: assignment → subject (matching unit) → built-in.

## Steps
1. `types.ts`: `PlanContext.subjectWeights?: { subjectId: string; unitType: UnitType; weightPerUnit: number }[]`.
2. `plan.ts`: look up `a.subjectId` and pass the match to `weightPerUnitOf`. The resulting `weightSource` can now be `"subject"`.
3. Bump `ENGINE_VERSION` by one patch level (the output changes only when the input is new).

## Tests
- A null-weight lessons assignment in Math (lessons 20) → thickness 20 a lesson, source `subject`.
- An explicit 12 beats Math's 20.
- Math's default for minutes doesn't apply to a lessons assignment.
- No subject weights → identical to before (a property check over the fixtures).
