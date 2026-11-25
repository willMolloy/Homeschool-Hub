# Sprint 18c progress: follow-ups from the Sprint 18b tester

Branch: `hh2/sprint-18c`, cut from `main` at the Sprint 21 merge (`81809b7`, PR #23). Tickets: `docs/tickets/sprint-18b-tester-follow-ups/`. S18c-07 is the independent tester's pass and is not part of this build. The pull request stays a draft. Do not mark it ready, and do not merge it. Hosting stays on hold. A per-child end date on a shared assignment is not in this sprint.

Sprint 21 is merged (PR #23, `81809b7`).

| Ticket | Commit | Notes |
|---|---|---|
| S18c-01 Other copies are the same time | 33e1829 | A workbook counts only when its dates share a day with this one. Next year's Treasure Island is not listed, and it does not add a days suffix. The same child and the same days add the copy's own dates ("Elias · Mon–Fri · Oct 1, 2026 – Mar 1, 2027"). A different child or different days keeps today's label. Update status, this week's amount, and the finish question are offered only for a copy that still counts. |
| S18c-02 Keep Continue and No on screen | b8df7b7 | After Save on a past end date, the question, Continue, No and Cancel are the first block in the sheet, so they sit inside an 800 px phone at 360 and 440 px. The words are unchanged. No, Cancel, and leaving it unanswered still save nothing. Today or later still saves with no question. |
| S18c-03 Keep the days on a long title | 3abc6bd | A year bar may shorten the title. The days suffix stays, including at 360 px. A book with no twin still has no days suffix. At 1280 px a title that fits is not cut. The edit sheet's accessible name still carries the days. |
| S18c-04 Give Other copies room above Save | ed5faa5 | The Other copies block has 28 px under it, so its buttons are not the next control on Save. Save still writes only the workbook that was opened. |
| S18c-05 Keep adjacent break titles apart | b9b630f | Neighbouring long-break titles truncate, or the later one drops a line, until their boxes are clear. At 1280 px Christmas break and Family visit still read in full. A single long title is only shortened to the plot, as Sprint 19 left it. |
| S18c-06 Show whole minutes | e468595 | The list and the edit box show a whole number (66.67 shows as 67). The stored minutes, the total and the weight are not rounded. Saving without a change sends nothing, so 66.67 stays stored. 67 is not snapped to the 60 preset. A book set to 30 shows 30 and stores 30. |
| S18c-07 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-18c-verification.md`. |

## Decisions

- **Overlap is shared days, including both ends.** A copy that ends the day the next one starts still counts. Two books in one school year whose dates do not meet are not copies for this list. "Same school year" is not a second rule.
- **The dates on the label are the copy's own start and end,** in the assignment card's date words (`Aug 16, 2027 – May 28, 2028`). They are added only when the children and the days both match.
- **The past-date answers lead the sheet.** Putting them where Save was pushed them just off an 800 px phone. They now sit under the title, and the sheet scrolls them into view if it was already scrolled. The question's words are unchanged.
- **A long bar keeps the days by shortening the title in front of them.** The days are not the part that is cut. A finished check or "Stopped" that follows the days stays with them.
- **Break titles separate only when they would overlap.** Truncation is tried first. If the earlier title cannot shorten enough to clear the next one, the later title drops 16 px. A title alone is unchanged.
- **Whole minutes are a display.** `formatDailyMinutes` rounds for the screen. `exactPreset` still matches the stored amount, so 66.67 stays on Custom and does not become 60. An untouched save keeps the stored number.

## Questions for the product owner

None that blocked the build. The tickets' defaults were used: overlapping dates rather than a school-year bucket, the copy's own dates on the label, space rather than a new screen under Other copies, and truncate-or-stagger for break titles.

## Gate counts

`bash scripts/check.sh` on this branch, ALL GREEN.

| | engine | API | web | db |
|---|---|---|---|---|
| Sprint 21, merged | 455 | 1221 | 1817 | 190 |
| Sprint 18c | 455 | 1221 | 1832 | 190 |

Engine tests also passed in the time-zone run (the same 455, seven extra passes).
