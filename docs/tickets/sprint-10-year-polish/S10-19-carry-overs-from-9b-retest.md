# S10-19 — Small carry-overs from the 9b re-test
**Source:** `docs/reviews/sprint-9b-verification.md` (R1, R2, R5, R7; all Low) · **Depends on:** — · **Size:** S

## Goal
The "Each entry" CSV can't be misread next to the totals, one sentence reads properly, and one smoke scenario stops being flaky.

## Context
- **R1:** in Export → Each entry, the School days column is per entry. A day in two entries appears in both rows, so adding up the column gives more than Records and the Totals CSV (Frank's This week: 5 + 1 + 0 = 6, true total 5). Nothing in the file says the column doesn't add up. `buildTable` in `apps/web/src/features/records/exportData.ts`.
- **R2:** when an entry is clipped to the chosen dates, its CSV row shows only the clipped dates and hours. The screen says "part of an entry from Nov 16 to Nov 20", but the file doesn't.
- **R5:** with no children, Records reads "Your log tracks School days." The field label is used as-is, mid-sentence (`trackedWords` in `RecordsPage.tsx`).
- **R7:** `scripts/smoke/scenarios/s2a-13-settings.mjs` timed out once (15 s wait for `/setup/settings` after logging in) when run straight after `axe-2a`. It passed in 2 re-runs on its own. This looks like a flaky test, not an app fault.

## Steps
1. **R1:** in the Each entry CSV, say plainly that School days are counted per entry. Add a note line under the wording line ("School days are per entry; a day in two entries is in both rows. For the real count, use the Totals export."), or an equally short header note. Keep the counts per entry.
2. **R2:** for a row clipped to the range, add the full entry's dates. Use the Notes column if notes are ticked, or a short "Part of" cell (for example "part of Nov 16–Nov 20"). Match the screen's wording.
3. **R5:** lowercase the field words inside the sentence ("Your log tracks school days."). Labels used on their own stay capitalised.
4. **R7:** find out why `s2a-13-settings` waits on the login redirect after `axe-2a`. Wait for the page's own ready signal, not just the path, or start from a clean session. Don't just raise the timeout.

## Done when
- A parent who adds up School days in the Each entry CSV is told, in the file, that the column is not additive and where the real count is.
- A clipped row shows which longer entry it belongs to.
- R5's sentence reads in lowercase.
- The full smoke run passes `s2a-13-settings` 3 times in a row.
- Only what's essential.

## Tests
- Web: `records-export.test.tsx` covers the note line (R1) and a clipped row (R2), and the Records lead sentence covers R5.
- Smoke: the full run, 3 times.

## Out of scope
- Changing how school days are counted (S9b-01 settled it).
- R3, R4 and R6: those are layout checks, for the S10-10 tester (see the README).
