# S7-16 — Typing a new subject and pressing Add never loses it

**Finding:** Sprint 6b F3  
**Depends on:** none  
**Size:** XS

## Goal
If a parent types a new subject name and presses the form's Add, the subject is created and used, never silently dropped.

## Steps
1. While the "New subject…" field has text, the form's Add first creates that subject (as "Add subject" would) and saves the assignment under it; on failure, show the error and save nothing.
2. While the field is open, the subject select shows "New subject…" (not the previous choice).

## Done when
- Type "Nature Study", press the form's Add: the assignment is saved under a new Nature Study subject.

## Tests
- Web: that flow; a failed subject create saves nothing; the select shows "New subject…" while the field is open.

## Out of scope
- Other subject fields on the form.
