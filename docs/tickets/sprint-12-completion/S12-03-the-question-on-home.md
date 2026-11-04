# S12-03 — The question on Home
**Size:** M
## Goal
A clear card at the top of Home asks about waiting assignments.
## Steps
1. One waiting: a card with the question and three buttons: **Yes, finished**, **Not yet**, **We stopped**. Soft Paper, the subject's colour and icon, 44 px targets. It sits above Home's other content and, on wide screens, spans both panes (like the briefing, baf21b7). If the briefing line also shows, the question comes first.
2. Several waiting: "3 assignments ended" opens a sheet listing each with the same three choices per row; answering removes the row.
3. **Yes:** sets finished, `ended_on` = the stored end date (editable in the same sheet with the DateField before saving).
4. **Not yet:** opens the DateField to pick a new end; saves through the existing end-date PATCH (undoable), so the plan adjusts.
5. **We stopped:** sets stopped, `ended_on` = today (editable).
6. The card goes when nothing is waiting.
## Done when
- Each answer works from Home at 360 and 1280 px; Undo reverses it.
## Tests
- Web: one vs several; each answer's request; Not yet moves the end; card order with the briefing; wide layout spans both panes.
