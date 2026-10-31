# S6b-14 — Clearer undo labels and no engine warnings on screen

**Finding:** Sprint 6 L3, L5  
**Depends on:** none  
**Size:** XS

## Goal
The undo bar says exactly what will be undone, and engine warning codes never show on a parent-facing screen.

## Steps
1. Undo labels for week adjustments include the child and week: "Adjusted Math 5 for Frank, week of Nov 2."
2. Engine warnings like "two overrides for the same week" are not shown as red text under a child's table; keep them for the debug view only (the briefing already reports plan problems in plain words).

## Done when
- The undo label after a week adjustment names the child and week; the duplicate-adjustment case shows no engine text on This Week.

## Tests
- API: the label text. Web: no warning text rendered outside debug.

## Out of scope
- Changing which warnings the engine produces.
