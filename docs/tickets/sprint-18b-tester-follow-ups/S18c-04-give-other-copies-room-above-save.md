# S18c-04 — Give Other copies room above Save

**Source:** L4 (Low) from the independent tester's READY pass on PR #20, tested head `d565cf24035c72a715650570bfb5039dbedb8070`. **Depends on:** S18b-02, merged. **Size:** XS. This file does not build it. Build it after Sprint 21.

## Goal

On the assignment edit form, the Other copies buttons are clearly separate from Save, so Save is not the next control after a copy's action.

## Context

At 360 px, Set up › Assignments › The Hobbit (read aloud) · Wren shows four secondary buttons immediately above Save, Cancel, Copy, and Archive, with almost no gap: "This week's amount for Elias", "This week's amount for Clara", "Update status", and "Did Elias and Clara finish?". Save still saves Wren's copy, which is correct, and the buttons above it name the other copy. The two jobs sit on top of each other, which strains the one-job screen.

## Steps

1. The Other copies block and the form's Save row have a visible gap, at 360 px, so the copy's buttons do not sit on Save.
2. Save, Cancel, Copy, and Archive still act on the workbook being edited. The buttons in Other copies still open that other copy and still do not change this one.
3. **Default, not a blocker:** keep the same buttons and the same words. Separate them with space, or with the existing section heading already in the block, rather than a new screen.

## Done when

- At 360 px, a parent can see that Save belongs to the form and that the buttons above it belong to the other copy.
- Saving the form still writes only the workbook that was opened.

## Tests

- Web: the Other copies section and the Save row are not adjacent with no gap; the form's Save still submits the assignment being edited. At 360 px.

## Out of scope

- Removing this week's amount, Update status, or the finish question.
- Opening this week's amount on a single row (L2, not a ticket).
- A per-child end date on a shared assignment. That was only discussed and is not decided.
