# S20-03 — Show a pending check-in on Home

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** S

## Goal

A previous week that still needs a check-in is obvious on Home, with a short reason, and she can skip it.

## Context

Update status is how the schedule stays honest, and it is easy to miss. Home already asks when an assignment's end has passed, and the Home tab shows a needs-you dot while something needs her answer. A late line or a heavy week does not light that dot. A missed check-in should join the things that do.

Checking in is optional. It must not block Home, Schedule, or Records.

## Steps

1. When the most recently finished week had planned work and has not been checked in, Home shows one clear card. Several assignments are one card, not one card per book.
2. The card says why it matters, in a short line, and offers a way into Update status for that week.
3. **Default, not a blocker:** the line is "How did last week go? Updating it keeps the schedule honest." The button is "Update last week".
4. The needs-you dot counts this card the way it counts a finish question. The Home link says the number of things that need her. A viewer does not see the card or the dot for it.
5. She can leave it and use the rest of the app. The card is not a gate. **Default, not a blocker:** it stays until that week is checked in. When a newer week finishes unchecked, the card is about the newest one only.
6. Checking in does not write a log entry. Logging does not check the week in.

## Done when

- With last week unchecked, Home shows the card and the dot, and she can open Schedule without answering.
- After she updates that week, the card and that part of the dot are gone.
- A week already checked in shows no card.

## Tests

- Web: an unchecked previous week renders the card and raises the needs-you count by one; a checked week does not; a viewer sees neither; answering does not create a log entry. The finish question still works beside it.

## Out of scope

- A required check-in, or a dismiss that hides the card for good without an answer.
- Changing what Update status saves (S20-02 and S18b-01).
