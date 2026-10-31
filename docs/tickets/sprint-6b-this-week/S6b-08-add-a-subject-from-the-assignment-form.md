# S6b-08 — Add a subject from the assignment form, with common presets

**Source:** Will's review (2026-10-31): "the dropdown for subject doesn't populate any options. We should be able to add subjects ourselves or use the preset basic options."  
**Depends on:** none  
**Size:** S

## Goal
A family with no subjects (or missing one) can pick a common subject or type a new one right in the assignment form's subject dropdown, without leaving the form.

## Context
- `AssignmentForm` (`features/schedule/AssignmentsPage.tsx`, also used by the timeline sheet and Add several) only lists existing subjects; with none it shows "No subjects yet. Add them under Subjects."
- `POST /api/subjects` creates a subject (name, optional colour from the safe palette, optional default weight and days). Subject names are unique per family (409 on a duplicate).

## Steps
1. The subject select gains, after the family's subjects: the common subjects the family doesn't have yet, under "Add a common subject": Math, Reading, Literature, Writing, Spelling, Grammar, History, Science, Geography, Art, Music, Foreign Language, Bible, PE (one named list, easy to edit); and a last option **New subject…**.
2. Choosing a common subject creates it (`POST /api/subjects`, next free palette colour) and selects it. **New subject…** shows an inline name field with Add; it creates and selects the subject. A duplicate name selects the existing one.
3. The "No subjects yet" hint goes away. Add several (S3a-04) gets the same select.
4. The Subjects screen's empty state offers the same common list as one-tap chips ("Add common subjects").

## Done when
- A new family can add its first assignment without visiting Subjects: pick "Math" from the list or type "Nature Study", and the assignment saves under it.
- Only what's essential; 360 px; 44 px.

## Tests
- Web (fake API): with no subjects the select shows the common list and New subject…; choosing Math posts the subject then selects it; New subject… posts and selects; a 409 selects the existing subject; the Subjects empty state chips create subjects.

## Out of scope
- Subject presets per curriculum.
