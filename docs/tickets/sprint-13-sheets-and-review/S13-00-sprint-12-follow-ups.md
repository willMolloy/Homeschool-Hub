# S13-00 — Sprint 12 follow-ups

**Source:** `docs/reviews/sprint-12-verification.md` (N1 Low, N2, N3) and Will's decisions of 2026-11-05 ("Go with your recommendations"; "It should adjust schedule").  
**Size:** S

## Steps
1. **One-tap "Yes, finished" (N2, Will).** On the Home card and in the several-waiting list, Yes saves at once with `ended_on` = the stored end date, shows the undo bar ("Marked Treasure Island finished · Undo"), and needs no date sheet. The date stays editable later through **Change** (S12-06). Not yet and We stopped keep their date sheets.
2. **Finished early adjusts the schedule (N3, Will).** When `ended_on` is before the planned end, the bar ends at `ended_on` (like stopped, but drawn as finished, with its check), work after that day is no longer planned, and the day's loads, ribbons and heavy-week counts follow. Finished on or after the planned end keeps the bar to the planned end. Engine: bump ENGINE_VERSION; keep `test:tz` green.
3. **Stopped label at 320 px (N1).** At 320 px default zoom a stopped bar always shows "Stopped" (outside the bar if it doesn't fit, per the S10-04b label rules), never a bare dashed stub.

## Done when
- Yes saves in one tap and Undo reverses it; a book finished two weeks early shows a bar ending that day and the following weeks lighter; a stopped bar reads "Stopped" at 320 px.

## Tests
- Web: one-tap Yes request and undo; label fallback for stopped bars. Engine: finished-early truncation and load changes; finished-late unchanged.
