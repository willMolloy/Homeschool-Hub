# Sprint 13 progress: printable sheets and term in review

Tickets: `docs/tickets/sprint-13-sheets-and-review/` (the README has Will's decisions). Branch `claude/test-coverage-analysis-6dehbu`, one commit per ticket, each pushed once `bash scripts/check.sh` ends ALL GREEN. **Build order:** S13-00 to S13-04, S13-06 (sheet scenarios only), then S13-05 (waiting for the UX mockup in `docs/design/`), the S13-06 term-review scenario after it, then S13-07 (the tester's).

| Ticket | Commit | Notes |
|--------|--------|-------|
| S13-00 Sprint 12 follow-ups | (this commit) | **One-tap Yes (N2):** on Home's card and in the several-waiting list, **Yes, finished** saves at once with `endedOn` = the stored end date (no date sheet), the question leaves, and the undo bar offers "Marked Treasure Island finished. Undo"; the buttons are disabled while it saves and an API refusal shows as an alert on the card or in the list. Not yet and We stopped keep their date sheets; the day stays editable through Change (S12-06, untouched). **Finished early adjusts the schedule (N3, Will):** engine **0.14.0**, `closePlan`: finished with `endedOn` before the planned end ends the bar at `endedOn` (days after it removed, `end` = `endedOn`, never before the start); on or after the planned end it keeps the planned end as before. Week bars, check-in weeks, heavy weeks and the ribbons follow because they read the plan's days. **Stopped label at 320 px (N1):** `placePieceNames` takes the plot's bounds for a stopped bar; when no name carries "Stopped" (cut, or none), "Stopped" stands alone on the bar's last piece: inside in full, else outside right while the row is free, else outside right up to the plot's edge, else outside left (`placeStoppedWord`). Tests: engine `ended.test.ts` (+3), API `s12-04-plan-ended.test.ts` (+1), web `s10-04b-labels.test.tsx` (+6), `s12-04-ended-on-the-schedule.test.tsx` (+1). **Changed expectations:** see Decisions |

## Decisions

- **S13-00 finished early supersedes S12-04's "a finished bar keeps its whole planned length"** (Will, 2026-11-05, "It should adjust schedule"). The test that said so (`ended.test.ts`, "finished before the end keeps the whole bar…") now expects the bar to end at `endedOn`. `engine-version`, `s12-04-plan-ended` and `s12-04-ended-on-the-schedule` expect 0.14.0, and the web test helper that imitates the engine's finished plan cuts the days at `endedOn` too.
- **S13-00 Yes is one tap in the list too,** and the sheet stays on the list after it (only the last answer closes it).
- **S13-00 the stopped word replaces a cut name** (it does not sit beside it): a bar whose name can't hold "Black Beauty · Stopped" shows "Stopped" alone, because a cut name without the word reads as an open bar. The title is still in the lane list and the edit sheet.
- **S13-00 changed test expectations:** `s12-03-question-on-home` (Yes is one tap: no Finished-on sheet, no Save; a refusal is an alert on the card; Undo is offered right after the tap; the list's Cancel case uses Not yet), `s12-05-needs-you-dot` (no Save after Yes), the `completion` smoke scenario (no save step after Yes), engine/API/web version checks (0.14.0), `ended.test.ts` (finished early).

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S13-00 | 437 | 1103 | 1458 | 163 |
