# Term in review: build notes (S13-05)

Mockup: `mockups/term-review.html`. Add `#card=full|sparse|dark|long` to the URL to see one card at full size. There is a PNG of each beside it.

## Layout

The card is drawn at its saved size, **1080 × 1350 px** (4:5), and scaled for screen with `transform: scale()`. It is one component.

- **Band:** child tint `color-mix(kid 45%, --bg)` (dark: 55%), padding 56/72/38. Eyebrow "Term in review" (or "Year in review") 24/800, tracked, in the child colour, with "Homeschool Hub" muted on the right. Title "Frank · Fall 2026" in Fraunces 600, 88 px, in the child's strong colour. Under it, US dates at 28 px, muted.
- **Full (3–4 parts):** stat tiles (88 px Fraunces, radius 28) for school days · finished · books read. Below them, **Time by subject**: a 36 px badge, a 28 px pastel bar scaled to the top subject, and the exact typed time ("31 h 15 m"), sorted by most time, with the total in the header. Then two columns: **Finished** (48 px rows, subject badge) and **Books read** (40 px rows, Fraunces).
- **Roomy (1–2 parts, the sparse card):** a 200 px hero number in the child colour, 106 px rows with a hairline between them ("Literature · finished Oct 16"), and a sprig pinned at the bottom so the space reads as margin.
- A part that isn't tracked or has no data is **left out**, never shown as 0.

## Long lists (15 or more)

- A list never scrolls, never shrinks its text and never runs onto a second image.
- It shows the rows that fit in the space left. When they don't all fit, the last row becomes muted "and N more".
- Rows run in the order they were finished or first logged.
- A part that is left out gives its height to the lists.
- The tiles still show the true totals.
- In the roomy layout, more than 6 rows switch to two columns.
- A long title takes one line and ends in an ellipsis. The heading steps down from 88 to 72 to 60 px.

## Must not get wrong

- **Real numbers only.** They must match Records and S13-04 exactly (S9b-01 range rules). No estimates, rounding, grades, percentages or streaks. No favourite book and no parent note.
- **Saved PNG:** 1080 × 1350 with **square corners** and no transparency. Render it on the device after `document.fonts.ready`, with the fonts embedded. No upload and no link. Web Share with the file is fine. All children gives one PNG per child.
- **Print:** one card per page, **always light**. The saved image follows the app theme.
- Term names and dates come from the family's term views.
- The sheet sits above the tab bar and opens on the range and child already picked in Records. Save image is the primary action.
