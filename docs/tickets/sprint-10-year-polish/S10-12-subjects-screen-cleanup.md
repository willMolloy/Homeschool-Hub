# S10-12 — Subjects screen cleanup (UX review 9)
**Source:** DeeDee's decision 2 (2026-11-03); UX review improvement 9 · **Depends on:** S10-11 · **Size:** S

## Goal
A parent changes a subject's colour from a small swatch row in its edit sheet. The list drops the colour dot, and "Show archived" is a switch.

## Context
- **Decided by DeeDee, 2026-11-03:**
  - a parent can change a subject's colour through a small swatch row in the subject's edit sheet;
  - drop the subject colour dot (the icon badge already carries the colour);
  - "Show archived" becomes a switch (UX review improvement 9).
- Today `RosterForm.tsx` shows the 8 swatches as large radio chips. Children use the same form.
- `RosterPage.tsx` shows a colour dot before each name and a checkbox for "Show archived".

## Steps
1. Show the 12 swatches (S10-11) as one small row in the edit sheet. Each one:
   - has a tap target of at least 44 px;
   - shows a tick on the chosen colour;
   - has an accessible name (for example "Mint, used by Math") when another active subject already uses it.
2. Drop the colour dot from the Subjects list. The badge stays.
3. Make "Show archived" a switch (`role="switch"`, 44 px target) that keeps the same behaviour.
4. Children's form shares the same component, so it also gets the 12 swatches. That is all that changes for children.

## Done when
- At 360 px, a parent can change Art's colour, see it on the Year view, and see which colours are already used.
- The list shows no colour dot.
- "Show archived" is a switch.
- Only what's essential.

## Tests
- Web:
  - the swatch row (12 swatches, the tick and the "used by" names);
  - saving a colour;
  - no dot in the list;
  - the switch toggles archived rows.

## Out of scope
- New palette hues (S10-11) and any change to the archive behaviour.
