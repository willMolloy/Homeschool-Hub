# S3a-01 — Copy an assignment from the Assignments screen

**Source:** ROADMAP.md, "Fast setup" (copy an assignment, including to another child)  
**Depends on:** none  
**Size:** S

## Goal
On the Assignments screen, a parent can copy an existing assignment into a new, prefilled Add form, change what differs (for example the child or the dates), and save it as a new assignment.

## Context
- `AssignmentsPage.tsx` renders `ScheduleList` with `AssignmentForm`. The edit form already takes an `extra` slot next to Save and Cancel.
- `AssignmentForm` decides add vs edit from `item`: `item == null` posts, otherwise it patches.
- A copy must never change the original.

## Steps
1. While editing an assignment, show a **Copy** button (secondary style) in the form's button row.
2. Copy closes the edit form and opens the Add form, prefilled from the original: subject, title with " (copy)" appended (cut to the 120-character limit), children, start and end dates, unit, total, and the stored `weightPerUnit` (a stored `null` stays `null`, so the copy follows the subject default as the original does).
3. Saving posts a new assignment with `POST /api/assignments`. The new assignment appears in the list; the original is unchanged.
4. Cancel discards the copy and leaves the list as it was.
5. Keep the change small: prefill the existing form (for example an `initial` prop used only when `item` is null), don't build a second form.

## Done when
- Copy appears only while editing an existing assignment, not on the Add form.
- The Add form opens prefilled as in step 2, with the weight suggestion **not** overriding the copied weight.
- Saving creates exactly one new assignment; no PATCH is sent for the original.
- Only what's essential: one Copy button, no new helper text.

## Tests
- Web (`apps/web/test/`): editing an assignment shows Copy; clicking it shows the Add form with each field prefilled and the title ending " (copy)"; Save sends one POST with those fields (and no PATCH); Cancel sends nothing.
- A title of 120 characters still produces a valid copy title (at most 120).
- A copy of an assignment with `weightPerUnit: null` posts `weightPerUnit: null`.

## Out of scope
- Copying from the timeline (S3a-02).
- Copying several assignments at once, or a whole subject or child.
