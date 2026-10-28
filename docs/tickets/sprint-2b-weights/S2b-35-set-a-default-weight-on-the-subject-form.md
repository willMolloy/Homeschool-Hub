# S2b-35 — Set a default weight on the subject form

**Depends on:** S2b-31, S2b-34  
**Size:** S

## Goal
The subject create and edit form has an optional "Default bar width" section: "Usually measured in [unit]" plus the thickness picker.

## Behaviour
- A collapsed section, "Default bar width (optional)", with the help text: "For subjects where pages don't tell the story, like math lessons or practice minutes. New assignments in this subject start here."
- The **unit select** (lessons, minutes, pages, chapters) and the **ThicknessPicker** for that unit.
- Changing the unit resets the picker to None. A weight per lesson isn't a weight per minute.
- Save sends `defaultWeight: {unitType, weightPerUnit}`, or `null` when the picker is None.
- **Edit:**
  - The stored default is shown.
  - Clearing it sends null.
  - A note under the picker when the subject has assignments without their own weight: "This changes the bars of 3 assignments that use the subject default." The count comes from the already-loaded assignments list.
- **Subject list:** a small chip "20 / lesson" on subjects with a default.

## Steps
1. Extend the subject form in `features/roster/RosterForm.tsx` (used by `SubjectsPage`), or split out a `SubjectForm` if `RosterForm` is shared with kids. The kids form must not show this (ISP).
2. `api/types.ts`: `Subject.defaultWeight`. Add the key to `BODY_KEYS`.

## Tests (`apps/web/test/subject-default-weight.test.tsx`)
- Create with lessons + Heavy → sends `{lessons, 22.5}`.
- None → null; a unit change resets the picker.
- Edit shows the stored value; clearing sends null.
- The affected-assignment note.
- The kids form has no such section.
- The server's 400 is shown.
