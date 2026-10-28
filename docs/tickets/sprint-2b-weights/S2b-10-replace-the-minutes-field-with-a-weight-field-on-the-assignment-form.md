# S2b-10 — Replace the minutes field with a weight field on the assignment form

**Depends on:** S2b-06  
**Size:** S

## Goal
The add and edit assignment form asks for "Weight per page/chapter/lesson" instead of "Minutes per …", and sends `weightPerUnit`.

## Context
`apps/web/src/features/schedule/AssignmentsPage.tsx`:
- The form has a minutes input (`LIMITS.minutesPerUnit = 600`), hidden for minutes.
- The card reads "184 pages · 3 min each" or "~20 min each".
- The patch includes `minutesPerUnit` when it changed.

## Steps
1. `api/types.ts`: add `weightPerUnit: number | null` to `Assignment`. `minutesPerUnit` stays optional until S2b-13.
2. **Form:**
   - A number input labeled `Weight per {page|chapter|lesson}`, `step="0.01"`, min 0.01, max 100 (from the engine constants), hidden for minutes.
   - A hint: "Relative effort. Default {1|10|15}. Bar thickness = {units} per day × weight."
   - Blank → `null` (built-in).
   - Client checks: > 0, ≤ 100, at most 2 decimals, with errors under the field like the other checks.
3. **Unit change in the form (D7):** when the unit select changes, reset the weight field to blank (or to the suggestion once S2b-11 lands) and always include `weightPerUnit` in the PATCH, so the API's "send a weight when changing unitType" rule is met.
4. **Card:** "184 pages · weight 1.4" or "· weight ~1 (default)". Minutes cards show nothing extra.
5. Stop sending `minutesPerUnit`. Update the fake API `BODY_KEYS` (`test/helpers/fake-api.ts`) to add `weightPerUnit`; keep `minutesPerUnit` allowed until S2b-13.

## Done when
- [ ] No "Minutes per" text remains on the assignments screen.

## Tests (`assignments-screen.test.tsx`)
- Add sends `weightPerUnit: 1.4`; blank sends null.
- Edit changing only the weight sends `{weightPerUnit}` only.
- Changing the unit sends `unitType` and `weightPerUnit`.
- Switching to minutes hides the field and sends `weightPerUnit: null`.
- Client errors for 0, -1, 1.234 and 101, with no request sent.
- Card text for explicit and default weights.
- Server 400 text is shown in the form (reuses the existing pattern).

## Out of scope
- Prefilling from the child's history (S2b-11).
