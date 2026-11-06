# S18-01 — Update status confirms and can be undone
**Finding:** E1 (Medium): Update status saves with no confirmation and no Undo; it's the one place a parent can't go back.  
**Size:** S
## Steps
1. Saving Update status shows the undo bar ("Updated Treasure Island · Undo"), like every other change.
2. Undo restores the previous check-in state and end date exactly (use the existing undo system; one entry per save).
## Done when
- An Update status save can be undone from the bar and the plan returns to before.
## Tests
- API: undo of a status save restores check-ins and end date. Web: the bar appears with the right label.
