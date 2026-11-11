# S21-04 — Undo a break with the schedule changes

**Source:** DeeDee, 2026-11-11. **Depends on:** S21-02, S21-03. **Size:** S

## Goal

One undo removes the break and puts every assignment end date and weekly amount back.

## Context

The save is one decision: the break plus the choices she made for the overlapping books. Undo has to reverse all of it. A second undo for each book would be easy to get half-wrong.

## Steps

1. After she confirms, the undo bar offers one action. **Default, not a blocker:** "Added February break. Undo", or "Updated February break. Undo" when she edited one.
2. Undo deletes the break if this save created it, or restores its previous dates if this save edited it, and restores every assignment whose end date or placement this save changed.
3. Books she left on "keep the end date" have the same end after undo as before. Books she pushed return to the old end.
4. A second change she makes later is its own undo. This undo does not reach past this save.

## Done when

- Undo after a February break with one kept end and one pushed end leaves no February break and both books on their original ends.
- The plan matches a snapshot taken before the save.

## Tests

- API: one undo entry; after undo, the break is gone (or back to its old dates) and both end dates match the snapshot, including a keep and a push in the same save. Web: the bar names the break and Undo restores the year view.

## Out of scope

- Undoing a break that overlapped nothing, beyond the undo days off already have.
- A per-assignment undo list.
