# Sprint 14 progress: accounts, and undo for Add several and CSV import

Tickets: `docs/tickets/sprint-14-accounts/` (the README has Will's decisions). Branch `claude/test-coverage-analysis-6dehbu`, one commit per ticket, each pushed once `bash scripts/check.sh` ends ALL GREEN. **Build order:** S14-00 to S14-06; S14-07 is the tester's.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S14-00 Sprint 13 leftovers | (this commit) | **N1:** `placeStoppedWord` no longer runs "Stopped" up to the plot's edge when the next bar is close (that drew over the next bar's label); it goes right only while the row is free (`limitX`), else left of the bar when no bar is earlier in the row, else it is dropped (the bar is still dashed and opens its edit sheet). **N2:** on a phone shorter than 640 px the review page's footer scrolls with the page (never covers the card or arrows); a line about a child with nothing shrinks the card by the room it takes. **N3:** Records' action buttons are `border-box` and one line, so "Term in review" is 45 px high like Log and Export (it was 66: the link was `content-box`). **N5:** on a week's sheet a day off for particular children names its day ("Wed · Dentist", a run "Thu–Fri · Day off"); a whole-family break and the day sheet read as before. Measured in Chromium: Records' three buttons 45 px at 320/360/390/1280; review footer static at 320 x 568. Tests: `s10-04b-labels` (+3, 1 changed), `s13-sheets` (+1). **Changed expectations:** `s10-04b-labels` "when the next bar is close" now expects the word to the left of the bar, and a stub with a bar on each side gets no word |

## Decisions

- **S14-00 N5 wording:** only children-specific days off get the day prefix; the ticket's example is "Wed · Dentist". A multi-day one reads "Thu–Fri · Day off".
- **S14-00 N2:** the footer is un-stuck below 640 px of height rather than shrinking the card under its 200 px minimum.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S14-00 | 437 | 1103 | 1518 | 163 |
