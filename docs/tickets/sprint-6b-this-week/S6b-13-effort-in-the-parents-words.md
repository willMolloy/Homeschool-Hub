# S6b-13 — Effort in the parent's words everywhere

**Finding:** Sprint 6 L4 and the tester's disagreement with S6-09 (no way back to the subject's usual effort)  
**Depends on:** none  
**Size:** S

## Goal
No parent-facing screen shows an effort weight; effort is always said in minutes a day, and an assignment can go back to its subject's usual.

## Context
- `docs/DESIGN_DIRECTION.md`, point 3: the parent's words, never the engine's numbers.
- The effort presets read "15 / 30 / 45 / 60 minutes" without "a day"; the hint says "default weight for lessons (15)"; the assignments list says "weight 12" or "weight ~15 (default)".

## Steps
1. Presets read "15 min a day" etc.; the hint says "Usually about 30 min a day" (converted with `minutesPerDayFromWeight` at the assignment's pace).
2. Add a quiet choice **Use the subject's usual** (shown when the assignment has its own effort and the subject has a default), which saves `weightPerUnit: null`.
3. Assignment cards show "about 30 min a day" instead of a weight; the subject form's default-weight section speaks in minutes for a typical day the same way (or hides the number), with no weight value shown.

## Done when
- Searching the rendered Assignments, Subjects and assignment form for "weight" finds no parent-facing text; "Use the subject's usual" clears the own effort.

## Tests
- Web: preset labels; hint wording; the use-usual choice sends null; cards and subject form show minutes, not weights. Update tests that asserted weight text, and say which.

## Out of scope
- Changing how effort is stored.
