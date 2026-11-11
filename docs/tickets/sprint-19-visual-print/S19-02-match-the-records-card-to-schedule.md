# S19-02 — Match the Records card to Schedule

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** XS

## Goal

On Home, the Records card is the same height as the Schedule card.

## Context

From 840 px, Home puts Schedule and Records side by side. Schedule is taller because it draws a small picture of the year. Records is only a heading and a line, so the pair looks uneven. Under 840 px the cards stack.

## Steps

1. Where the two cards sit side by side, the Records card's box is as tall as the Schedule card's box.
2. Do not add a second chart, a number, or extra copy to fill the space.
3. **Default, not a blocker:** under 840 px, where the cards stack in one column, each stays as tall as its own content. Stretching Records on a phone would add an empty block in the scroll.

## Done when

- At a wide Home, with assignments so Schedule shows its year picture, Records matches that height.
- A family with no assignments still shows two even cards.
- Only the card heights change.

## Tests

- Web: at 1280 px the two card boxes are the same height; at 390 px each card is only as tall as its content. Light and dark.

## Out of scope

- Rewriting the Schedule or Records subtitle (Sprint 20 changes the Records line when books read go).
- The checklist under Records.
