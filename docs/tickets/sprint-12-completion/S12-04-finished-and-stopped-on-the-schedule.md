# S12-04 — Finished and stopped work on the schedule
**Size:** M
## Goal
The schedule shows what ended and stops warning about it.
## Steps
1. **Finished:** the bar keeps its place, drawn calmer (lighter fill) with a small check after the name; the edit sheet says "Finished Nov 2".
2. **Stopped:** the bar ends at `ended_on` and is drawn muted with "Stopped"; work after that date is no longer planned.
3. Neither produces late, heavy-week or unplaced warnings, and neither appears in this week's Week bars after it ended. (Engine input: an ended assignment is treated as closed at `ended_on`; bump ENGINE_VERSION if plan output changes.)
4. Records is unchanged (logs stay separate).
## Done when
- After answering, the briefing no longer mentions the assignment and the Year view shows its state in light and dark.
## Tests
- Engine: closed assignments produce no forecast, warnings or work after `ended_on`. Web: bar styling and sheet text.
