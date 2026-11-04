# S12-06 — Change an answer
**Size:** XS
## Goal
A parent who answered wrongly can fix it later, not only with Undo.
## Steps
1. The assignment's edit sheet (Year and the Assignments list) shows "Finished Nov 2" or "Stopped Oct 30" with **Change** → the same three choices, or "Not ended" to reopen (clears `ended_as`; it waits again if its end has passed).
## Done when
- Reopening a finished assignment brings back its bar and, if its end has passed, the question.
## Tests
- Web: change and reopen.
