# S18c-02 — Keep Continue and No on screen

**Source:** L1 (Low) from the independent tester's READY pass on PR #20, tested head `d565cf24035c72a715650570bfb5039dbedb8070`. **Depends on:** S18b-01, merged. **Size:** XS. This file does not build it. Build it after Sprint 21.

## Goal

After Save on a past end date, the question and its answers are on screen together, so the parent does not have to scroll to answer.

## Context

S18b-01 asks "That's before today; this ends the book now. Continue?" and waits. Nothing is saved until Continue. On a phone 800 px tall, at 360 px and at 440 px, the question appears where Save was, and Continue, No, and Cancel sit just below the screen. The parent has to scroll. No data is lost in the meantime.

## Steps

1. Follow the S18b-01 path: Schedule › Week › Update status › Fell behind › Pick a date before today and after the week being updated › Save.
2. The question, Continue, No, and Cancel are visible together without scrolling, at 360 px and at 440 px, on a screen about 800 px tall.
3. No, Cancel, and leaving the question unanswered still save nothing. Continue still saves, and Undo still restores the week.

## Done when

- On that phone, answering does not require a scroll.
- The words of the question are unchanged, and a date of today or later still saves with no question.

## Tests

- Web: after Save on a past date, Continue and No are inside the visible sheet (or the sheet has moved them into view) at 360 px and 440 px with an 800 px height. No write is sent until Continue.

## Out of scope

- Changing when the question is asked (S18b-01).
- A new confirmation for a date that is today or later.
- The other findings in this folder.
