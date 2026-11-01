# S7b-09 — Week adjustments never change past weeks

**Finding:** independent review F-02 (High, `docs/reviews/pr3-independent-verification.md`): a "Keep the end date" adjustment on a coming week rewrote last week's planned range ("Lessons 25–30" became "26–30") and raised past and current weeks' amounts. Push mode doesn't.  
**Depends on:** none  
**Size:** M

## Goal
Adjusting the current or a coming week only spreads the difference over that week's following weeks; every week before the adjusted one keeps exactly the amounts it had.

## Context
- With keepEndDate, `placeSegment` (engine `placement.ts`) recomputes one rate over all non-override days from the assignment's start, so an adjustment changes days before it, including weeks already past or checked in. S4-00 fixed the same problem for missed days with a re-anchor (`reanchor.ts`, `replanFrom`).

## Steps
1. In the engine, apply a keepEndDate week override by anchoring at the start of the adjusted week: plan as if the override didn't exist, keep every day before the week's start as placed, fix the week's units as the override says, and replan what's left from the week after with keepEndDate. Reuse the S4-00 re-anchor.
2. Several overrides apply in week order on top of each other; check-ins keep their precedence (S2b-38).
3. Bump `ENGINE_VERSION`.

## Done when
- The review's reproduction: last week's range and every past and current week's amounts are unchanged after a coming-week keepEndDate adjustment; the difference shows only in later weeks; units are conserved.

## Tests
- Engine: the reproduction; two overrides; an override plus a later check-in; pushEndDate unchanged; units conserved; `test:tz`. API: `/api/plan` before and after for the past weeks.

## Out of scope
- Changing pushEndDate.
