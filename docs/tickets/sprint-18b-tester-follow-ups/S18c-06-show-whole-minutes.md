# S18c-06 — Show whole minutes

**Source:** Low, nice-to-have, from the Sprint 20 tester. **Depends on:** Sprint 20, merged (PR #22). **Size:** S. This file does not build it. Build it after Sprint 21, with S18c-01 to S18c-05.

## Goal

A minutes assignment shows a whole number of minutes a day wherever that amount is shown. The stored amount stays exact.

## Context

Seeded minutes assignments show fussy daily amounts such as "66.67 min a day". The list and the form both show the stored `minutes_per_day` (or the total divided by the school days, when an older row has no stored daily amount). Two decimal places are exact, and they are also hard to read. A parent counts minutes in whole minutes.

## Steps

1. Keep storing the exact minutes a day. Do not round the stored number, the stored total, or the weight just to make the display tidy.
2. Wherever the daily amount is shown (the assignment list, the edit form, and any other place that prints minutes a day), show a whole number of minutes.
3. An unchanged save does not drift. Opening a book that stores 66.67 and saving it without a change leaves 66.67 stored. The display may say 67 the whole time. Saving a new number she typed stores that number.

## Done when

- A seeded book that stores 66.67 minutes a day shows a whole number of minutes, and saving it without a change still stores 66.67.
- A book she sets to 30 still shows 30 and stores 30.

## Tests

- Web or engine: a non-integer daily amount is displayed as a whole number, and a save that does not change the field leaves the stored value unchanged.

## Out of scope

- Changing how a minutes bar is planned, or how many minutes a day she is asked for (Sprint 20).
- Rounding pages, lessons, or chapters.
- S18c-01 to S18c-05.
- Sprint 21.
