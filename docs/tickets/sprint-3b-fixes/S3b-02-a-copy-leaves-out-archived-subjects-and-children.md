# S3b-02 — A copy leaves out archived subjects and children

**Finding:** L2  
**Depends on:** none  
**Size:** XS

## Goal
Copying an assignment never pre-selects an archived subject or child, so the copy can be saved once the parent fills any gap.

## Context
- `copyOfAssignment` copies `subjectId` and `childIds` as stored. If either is archived, Add fails with a bare "every id must be one of your active subjects/children."
- The same prefill is used by the Assignments screen and the timeline (S3a-01, S3a-02).

## Steps
1. In the prefill, drop archived child ids, and clear the subject if it is archived (so "Choose a subject…" shows).
2. Everything else is copied as before.

## Done when
- Copying an assignment with an archived subject opens with no subject selected and a working Add once one is chosen.
- Copying with one archived and one active child keeps only the active child.
- Copying with only archived children opens with no child selected, and the usual "Pick at least one child." shows on Add.

## Tests
- Web: the three cases above, from the Assignments screen; one case from the timeline edit bar.

## Out of scope
- Unarchiving from the copy form.
