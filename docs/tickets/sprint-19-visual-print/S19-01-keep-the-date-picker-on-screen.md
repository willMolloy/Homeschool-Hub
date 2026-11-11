# S19-01 — Keep the date picker on screen

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** S

## Goal

The date picker stays fully visible when she adds or edits an assignment, on a desktop and on a phone.

## Context

Start and End use the shared date field. On a wide screen the add and edit assignment sheet is a panel on the right (she called this the configuration tab). The calendar hangs from the field and can sit partly off the screen to the left of that panel. The same field is used on the phone sheet.

## Steps

1. Opening the calendar from Start or End in the right-hand panel keeps the whole month grid on screen. No day, and no Today button, is clipped by the panel or past the left or right edge of the screen.
2. The same is true on a phone, including a narrow phone where the calendar already tries to span the screen.
3. She can still type a date or pick one. The value saved does not change.
4. **Default, not a blocker:** if the grid would cross the edge of the screen, shift it sideways until it fits; if there is no room below the field, open it upward. Prefer keeping it inside the panel. If the panel would clip it, let it overlay the page rather than hide part of the grid.

## Done when

- On a desktop, Start and End in the right-hand assignment panel open a calendar that is fully visible.
- On a phone, the same fields do too.
- Only the calendar's position changes. The date she picks is saved as it is now.

## Tests

- Web: the calendar's box stays inside the viewport at 1280 px (right-hand panel) and at 320 and 390 px (sheet). A picked date still saves. Light and dark.

## Out of scope

- A new date format, or limiting which dates she may pick.
- The past-date confirmation (S18b-01).
