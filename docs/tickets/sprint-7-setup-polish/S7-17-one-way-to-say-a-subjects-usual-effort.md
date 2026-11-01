# S7-17 — One way to say a subject's usual effort

**Finding:** Sprint 6b F4, F5  
**Depends on:** none  
**Size:** S

## Goal
A subject's usual effort reads the same everywhere, in words a parent uses, and the form no longer says "bar width".

## Context
- Today one default shows as "about 40", "about 41" and "about 32 min a day" on three screens, because each converts at a different pace (`docs/DESIGN_DIRECTION.md`, point 3: the parent's words; consistency).

## Steps
1. **Subject screens** (Subjects list, subject form) state the usual effort per unit, which doesn't depend on pace: "about 2 min a page", "about 30 min a lesson" (coordinator's call). Rename "Default bar width" to "Usual effort" and make chips read e.g. "Light · 15 min a lesson".
2. **Assignment screens** (form, cards) keep "about N min a day" at that assignment's own pace, and the form's hint says where it comes from: "Math usually takes about 30 min a lesson (about 32 min a day here)."
3. Add one shared helper for these texts so every screen uses it.

## Done when
- The same subject shows the same per-unit figure on the Subjects list and the subject form; no screen says "bar width"; assignment screens show their own daily figure with the subject's per-unit figure in the hint.

## Tests
- Web: the helper's texts; the three screens show consistent figures. Update tests that asserted the old wording, and say which.

## Out of scope
- Changing how effort is stored.
