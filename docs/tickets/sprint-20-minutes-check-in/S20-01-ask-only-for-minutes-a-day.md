# S20-01 — Ask only for minutes a day

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** M

## Goal

A minutes assignment asks how many minutes a day, and the dates, and the bar's thickness is that daily amount.

## Context

Pages, lessons, and chapters ask how much content there is, then how long a day of it takes. Minutes have been following that shape: a total, plus a time. She does not want a total for minutes. Thirty minutes of piano has no pile of minutes to finish. Sprint 19 must not change this storage. This sprint may.

The plan today stores a total and a weight, and thickness comes from minutes a day at that pace. Pulling the end date in on a content assignment makes the bar thicker. For piano, changing the dates must not change the minutes a day she typed.

## Steps

1. On add and on edit, when the unit is minutes, ask for minutes a day and the start and end dates. Do not show a Total, and do not ask how much content there is.
2. The year bar, the week bar, and the pace line use that daily amount. Shortening or lengthening the dates leaves the minutes a day as she set them.
3. Add several and CSV import follow the same rule for a minutes row: minutes a day, no total.
4. Update status for a minutes assignment does not ask "they got to minute N of M". **Default, not a blocker:** it can still say the week stood, or offer the end-date choices when she wants a different span. It does not invent a total to feed the old stepper.
5. **Default, not a blocker:** if the engine still needs a number in the total field, derive it so the minutes a day stay constant when the dates change, and never show that number. An existing minutes assignment opens on the minutes a day it already implies, with the total hidden.
6. Pages, lessons, and chapters keep Total and the time question.

## Done when

- Adding "Piano, 30 minutes a day, Sep 8 to May 21" saves with no total asked, and the bar reads as 30 minutes a day.
- Moving the end date does not change those 30 minutes.
- A pages assignment still asks for a total.

## Tests

- Engine or API: minutes a day stay put when the end date moves; a pages assignment still thickens when the same total is squeezed into fewer days. Web: the minutes form has no Total; Add several and a CSV minutes row reject or ignore a total and take minutes a day. Update status on piano has no "of N minutes" stepper.

## Out of scope

- Redesigning week adjust for pages, lessons, or chapters.
- The got-through number on a chapter week (S20-02).
- Bar colour and the percentile clamp (Sprint 19). Those stay as Sprint 19 left them; this ticket only feeds them a daily minutes load.
