# S18b-01 — A past Pick a date asks before it saves

> **Status: built in Sprint 18b** (`docs/progress/sprint-18b.md`). The text below is the decision as written.

**Source:** M1 (Medium) in `docs/reviews/sprint-18-verification.md` (the same report is in `docs/reviews/pr17-verification.md`). **Depends on:** DeeDee's decision of 2026-11-06, recorded here. **Size:** S when a later sprint builds it. This file does not build it.

## Goal

Record that Pick a date may be before today, and that saving a past date asks the parent to confirm before the book ends.

## Context

Sprint 18 (S18-02) let Update status offer Keep, Move the end to the late line's date, or Pick a date. The builder set the lower limit on purpose: the picked date has to fall after the end of the week being updated. The DateField has no minimum of its own. A date after that week and before today saves, the assignment's end moves to that day, and Home treats the book as ended.

DeeDee decided on 2026-11-06: past dates remain allowed, and saving one requires an explicit confirmation. A minimum of today was the provisional recommendation while she was deciding. She did not choose it.

The confirmation uses the tester's sentence, which states the consequence: "That's before today; this ends the book now. Continue?"

### Repro (tester, today Thu Nov 5, 2026, Hartley family)

1. Sign in as Rachel. Go to Schedule › Week (Nov 2–8) › Elias › tap A Child's History of the World › Update status.
2. Tap Fell behind, set "They got to" to page 210, then tap Pick a date and type "Nov 3, 2026". Tap Save.

- The tester expected a date before today, or before the current end, to be refused or questioned, as with "Pick a date after Nov 1, 2026." S18-02 said "a parent can pick any later date".
- It saved (PUT 200) and the end became 2026-11-03. Home immediately showed "3 assignments ended… Answer them" and "will finish about 8 weeks late".
- The only lower limit was the end of last week. Nov 1 was refused with "Pick a date after Nov 1, 2026."
- Nov 20, 2026, earlier than the current Dec 18 end and after today, was also accepted with no comment while the book was behind. That case is outside this decision. This ticket covers a date before today.
- Undo restored everything (0 differences). Screenshots: `us8-saved-Nov_3_2026.png`, `us7-pick-Nov_1_2026.png`.

## Steps

This ticket records the decision. It does not change the app.

1. A picked date before today stays allowed. The picker is not limited to today.
2. Saving that date asks first, in the tester's words: "That's before today; this ends the book now. Continue?" The save waits for the answer.
3. Continue saves as it does now, including the undo entry. The book can end at once, and Home can ask whether it was finished.
4. Leaving the question unanswered, or answering no, leaves the end date where it was.
5. A date on or before the end of the week being updated is still refused ("Pick a date after Nov 1, 2026." in the repro). No confirmation is offered for a date the sheet already refuses.
6. A date of today or later needs no new confirmation. Nov 20, before the current end and after today, stays as it is.

## Done when

- This file, HANDOFF and ROADMAP state DeeDee's decision, and the repro above is unchanged.
- The app still has no confirmation. Building it belongs to a later sprint.

## Tests

None in this docs pass. A later build covers the repro: Nov 3 asks and does not save until Continue; answering no leaves Dec 18; Continue sets 2026-11-03 and Undo restores the week and the end with 0 differences; Nov 1 is still refused; a date of today or later saves without the new question.

## Out of scope

- Implementing the confirmation in this pass.
- Refusing past dates, or setting the picker's minimum to today.
- A new question for a date that is after today and before the current end (the Nov 20 observation).
- L1, L2 and L3 from the same report.
- School days on a shared book (S18b-02).
