# S2b-10 — Replace the minutes field with a weight field on the assignment form

**Depends on:** S2b-06  
**Size:** S

## Goal
The add and edit assignment form asks for "Weight per page/chapter/lesson/minute" instead of "Minutes per …", and sends `weightPerUnit`.

## Context
`AssignmentsPage.tsx` has a minutes input (`LIMITS.minutesPerUnit = 600`) that is hidden for minutes, and card text "· 3 min each" or "~20 min each".

## Steps
1. `api/types.ts`: add `weightPerUnit: number | null` to `Assignment` (`minutesPerUnit` stays optional until S2b-13).
2. **Form:**
   - A number input labeled `Weight per {page|chapter|lesson|minute}`, step 0.01, bounds from the engine constants. It is shown for **every** unit type (D21).
   - Hint: "Relative effort; 1 point ≈ 2 minutes. Blank = the subject's default or the built-in ({1|10|15|0.5})."
   - Blank → null.
   - Client checks: > 0, ≤ 100, at most 2 decimals.
3. **Unit change in the form (D7):** reset the field to blank (or to the suggestion, S2b-11) and always include `weightPerUnit` in the PATCH.
4. **Card:**
   - "184 pages · weight 1.4"
   - "· weight ~2 (subject)"
   - "· weight ~1 (default)"
5. Stop sending `minutesPerUnit`. Add `weightPerUnit` to the fake API `BODY_KEYS`.

## Tests (`assignments-screen.test.tsx`)
- Add sends 1.4; blank sends null.
- Edit with only the weight changed sends `{weightPerUnit}`.
- A unit change sends both fields.
- Minutes shows "Weight per minute" and sends 0.75.
- Client errors for 0, -1, 1.234 and 101, with no request sent.
- The three card variants.
- The server's 400 text is shown.

## Out of scope
- Pre-filling and the hint (S2b-11), and the picker (S2b-34; this form keeps a plain number field).
