# S7b-05 — A late line offers one next step

**Finding:** CM run #3 and #6: "{title} will finish about N weeks late" offers no next step.  
**Depends on:** S7b-04  
**Size:** S

## Goal
A "will finish late" briefing line offers one clear action: move the end date to the forecast, or keep it.

## Steps
1. The late line gets a small **Move end to {date}** button. It PATCHes the assignment's end date to the forecast finish (undoable: "Moved {title}'s end to {date}."); the line then disappears because the plan now ends on time.
2. A quiet **Keep {current end}** dismisses the line for that assignment until the forecast changes again (remembered on the device).
3. "Won't finish this school year" lines get the same Move button (to the forecast, or the last school day when beyond it).

## Done when
- Tapping Move updates the end date, the bar stretches, the line goes, and Undo restores it.

## Tests
- Web: the button's PATCH and label; Keep hides the line until the forecast changes; undo.

## Out of scope
- Changing the check-in (Sprint 8, S8-06).
