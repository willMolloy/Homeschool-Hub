# Sprint 20 progress: minutes, check-in, and logging

Branch: `hh2/sprint-20`, cut from `main` at the Sprint 19 merge (`2cdc475`, PR #21). Tickets: `docs/tickets/sprint-20-minutes-check-in/`. S20-07 is the independent tester's pass and is not part of this build. Sprint 21 stays ticketed and unbuilt. The Sprint 18b tester follow-ups, including S18c-05, stay ticketed and unbuilt and come after Sprint 21. Hosting stays on hold.

| Ticket | Commit | Notes |
|---|---|---|
| S20-01 Ask only for minutes a day | 9e02e80, 13b2f36 | A minutes assignment asks for minutes a day and the dates. The stored total is that amount times the school days in the span (weight 0.5, so one unit is one minute) and is not shown. Moving the dates rescales the total, on the form and on the API, so the daily amount stays. A day off does not thicken the other days (`plan.ts`, engine 0.15.0). Pages, lessons, and chapters still ask for a total and still thicken when the same total is squeezed. Add several and CSV treat a minutes number as minutes a day (over 1,440 is rejected). Update status on a minutes assignment says "This week stood" and can change the end date. It has no "of N minutes" stepper. The sample family no longer matches the prototype's thickened piano and violin days. A bar that falls under the name height uses the label above the row. |
| S20-02 Leave the got-through number alone | 531ff1d | The box opens on the last unit the week's words name (chapters 16–18 open on 18, not on a position that rounds to 19). Tapping As planned, Got ahead, or Fell behind does not change the number. The highlight follows the number. Save stores what she typed. The named end counts as as planned, so a rounded 18 is not saved as behind 18.6. A saved week reopens on the saved number. |
| S20-03 Show a pending check-in on Home | b993d81 | When the most recently finished week had planned work and has not been checked in, Home shows one card: "How did last week go? Updating it keeps the schedule honest." and "Update last week". The needs-you dot counts it. She can open Schedule without answering. A viewer sees neither the card nor the dot. Checking in does not write a log entry. A finish question still sits beside it. |
| S20-05 Take books read off the log | b0c8525, 187fff4 | Built before S20-04 and S20-06. Books read is gone from log setup, the log form, suggestions, Records' "books mentioned" list, export, and the print summary. The API rejects a setup that turns books on. Books finished stays, and it shows from the schedule even when the log does not track books. Term in review lists those finished books (heading "BOOKS"), not typed titles. Old titles stay in the database and are not shown or edited. Home's Records line is "Attendance and hours". The demo seed no longer turns the field on. The term-review smoke marks a pages assignment finished so the card still shows a book. |
| S20-04 Explain the logging styles with a sample | 81b8d8b | Each style has a plain explanation. A sample Tuesday for Frank updates as the style or a switch changes. Days attended is a school day and no hours. Hours by subject is Math 30 min and Reading 20 min. No books line. |
| S20-06 Open a log on one day | 46948f6, eeaa3a2 | A new entry opens on one date, labeled Day, with Count as a school day on. "Log more than one day" reveals First day and Last day and the day ticks. Editing a one-day entry stays on Day. Editing a longer entry opens on First day and Last day. |
| S20-07 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-20-verification.md`. |
| S18c-05 Keep adjacent break titles apart | | Docs only. Not built. Queued after Sprint 21 with S18c-01 to S18c-04. |

## Decisions

- **Minutes are a daily amount, stored as a total.** The engine still needs `totalUnits`. For minutes it is minutes a day times the school days in the dates, and `weightPerUnit` is the built-in 0.5 so the bar's thickness is minutes ÷ 2, as Sprint 19 left it. The number is not shown. Pages, lessons, and chapters are unchanged, including the 100,000 cap. A derived minutes total may be larger, up to 1,600,000, which still fits the column.
- **A day off does not thicken piano.** The plan places the daily amount on the days that still have capacity. The minutes that would have fallen on a blocked day are not spread onto the others. A pages assignment still thickens.
- **Date moves keep the minutes.** The assignment form sends a new total when the dates or the days change. A date move that does not send a total (the year bar, a briefing, Update status, Pick a date) is rescaled by the API from the family's school days, then the subject's days, then the assignment's own days. A mid-span weekday history (`weekdaysFrom`) is not recomputed day by day; the current days are used for the count.
- **CSV and Add several.** The number in the total column, for a minutes row, is minutes a day. A number above 1,440 is rejected. The stored total is that amount times the school days.
- **Update status for minutes.** There is no unit to get through, so there is no stepper and no "of N". The week stood. "Change the end date" offers Keep and Pick a date. There is no computed "move by the shortfall", because there is no shortfall.
- **Got through.** The opening number is the last unit named by `rangeWords` for that week (the same words as a chapters 16–18 line). Chips only reflect the number. Saving the named end sends the plan's own position, so the week stays as planned.
- **The check-in card is the newest finished week only.** `GET /api/check-ins` is already that week. An older unchecked week does not get its own card. The card stays until that week is reviewed. It is not a gate.
- **Books read.** The column stays. PATCH that omits `books` leaves stored titles. The setup cannot set `books: true`. Term in review and Records' Books finished card use `booksFinished` (pages or chapters, marked finished, `endedOn` in range).

## Questions for the product owner

None that blocked the build. The tickets' defaults were used where a label was not chosen: the check-in sentence and button, the logging explanations and the Frank/Tuesday sample, "Log more than one day", and "This week stood" plus Keep or Pick a date for a minutes assignment.

## Gate counts

`bash scripts/check.sh` on this branch, ALL GREEN, after 13b2f36.

| | engine | API | web | db |
|---|---|---|---|---|
| Sprint 20 | 440 | 1212 | 1803 | 190 |

Engine tests also passed in the time-zone run (the same 440, seven extra passes). Web grew by the new ticket tests from 1792 at the Sprint 19 head.
