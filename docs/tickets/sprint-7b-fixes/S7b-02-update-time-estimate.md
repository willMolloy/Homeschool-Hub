# S7b-02 — "Update time estimate" replaces Heavier and Lighter

**Source:** CM run #4 and Will (2026-10-31): the feature is a recalibration ("We thought 15 pages would take 30 minutes but it's actually taking 45"), but "Heavier/Lighter ×1.25" makes parents guess a percentage and "Lighter" reads as less work. Will approved this design.  
**Depends on:** none  
**Size:** S

## Goal
Under the edit bar's **More**, one item **Update time estimate** opens a small sheet where the parent says, in minutes, how long a day of this assignment really takes.

## Steps
1. Replace **Heavier** and **Lighter** in the More menu with **Update time estimate**.
2. The sheet shows: the assignment title; "We estimated about {N} min a day ({units} a day)"; "How long is it actually taking?" with 15 / 30 / 45 / 60 / Custom (minutes a day), the nearest to the current estimate preselected; the line "{Child}'s next {Subject} books will start from this too." (when it carries forward); Save / Cancel.
3. Save converts minutes a day to `weightPerUnit` at the assignment's pace (`weightFromMinutesPerDay`), PATCHes it (which records the weight choice that carries forward, S2b-07/08), and is undoable with the label "Updated the time estimate for {title}." No "weight" wording anywhere.
4. Remove the `nudgedWeight` buttons; keep the helper only if something else uses it.

## Done when
- Treasure Island estimated at 30 min a day → Update time estimate → 45 → Save: its bar thickens by half, the dates are unchanged, Frank's next Literature book suggests about 45 min a day at the same pace, and Undo restores 30.

## Tests
- Web: the menu item; preselection; custom minutes; the PATCH value; the undo label; no "weight" text. Update the S6-10 nudge tests and say which.

## Out of scope
- Changing the schedule (dates or amounts).
