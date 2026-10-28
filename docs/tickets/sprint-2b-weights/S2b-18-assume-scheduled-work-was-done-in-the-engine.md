# S2b-18 — Assume scheduled work was done in the engine

**Depends on:** S2b-14  
**Size:** M

## Goal
The engine plans as if every scheduled day before today was done as planned. Logs no longer move bars, so an unlogged week doesn't pile onto this week.

## Context
- Today `planChild` computes `remaining = total - Σ logged units` and plans `remaining` from `planFrom = max(start, asOf)`. Days before `asOf` show only logged units (`kind: "logged"`).
- So a family that teaches but doesn't log gets a catch-up wave. `docs/progress/overnight.md` S1-35 records it: the week of Oct 26 shows **135 pages (33.75/day) instead of 90**, because the unlogged week of Oct 19 rolls forward.
- DeeDee's decision: the plan assumes work was done unless the parent says otherwise (through check-ins, S2b-20). **Logging is optional and feeds only hour totals and exports.**

## New semantics
- The plan is computed **from the assignment's start**, as if `asOf` were the start, whatever today is. Bars for a given day no longer change just because time passed.
- `asOf` only **labels** days:
  - Days before `asOf` get `kind: "assumed"` (planned, presumed done).
  - Days from `asOf` on are `planned` or `override` as today.
  - The old `logged` kind is removed.
- `ctx.progress` (`ProgressEntry`) is **ignored** and marked `@deprecated — removed in S2b-19`, so the API keeps compiling in this commit.
- Overrides keep working, on the full timeline.

## Steps
1. `plan.ts`: delete the log-summing block and `loggedByDay`. Replace `planFrom = max(S, asOf)` with `planFrom = S`. After planning, set `kind = "assumed"` on output days with `date < asOf`. `complete` is now false unless the total is 0 (check-ins bring "finished early" back in S2b-20).
2. `types.ts`:
   - `DayKind = "assumed" | "planned" | "override"`.
   - Update the `PlanContext.asOf` doc: "Days before it are labelled assumed; it does not change the plan."
   - Deprecate `progress`.
3. Update the tests that relied on catch-up: `plan.progress.test.ts`, the `asOf` cases in `plan.basic.test.ts`, and the frozen-proto regression. The proto has no logs, so compare with `asOf = start`.
4. Set `ENGINE_VERSION` to `0.4.0`.

## Done when
- [ ] **Regression:** the sample family's 184-page assignment starting 2026-10-19 with `asOf = 2026-10-26` gives **90 pages for the week of Oct 26** (22.5/day), not 135. Add it as a named test, "unlogged work does not roll forward (DeeDee, Oct 28)".
- [ ] Plans for `asOf` values of 2026-10-19, 2026-10-26 and 2026-11-30 produce identical units on every day; only the `kind` labels differ.

## Tests
- The regression above, plus `asOf` invariance (a property test over fixtures and 5 random `asOf` dates).
- Progress entries passed in → no effect.
- Days before `asOf` are `assumed`, and the rest are `planned`/`override`.
- An override week in the past still shows its override units (`kind: assumed`, `overrideMode` kept on the plan).
- The API test `plan.test.ts` for `asOf=2026-10-26` flips from 135 to 90. Do it in this ticket so the gate stays green, and update the S1-35 note in `overnight.md` to "superseded by S2b-18".

## Out of scope
- Actual-progress input (S2b-20) and the loader change (S2b-19).
