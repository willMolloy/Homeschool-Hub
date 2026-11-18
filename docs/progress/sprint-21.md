# Sprint 21 progress: a break that overlaps assignments

Branch: `hh2/sprint-21`, cut from `main` at the Sprint 20 merge (`b0f3f56`, PR #22). Tickets: `docs/tickets/sprint-21-break-overlap/`. S21-05 is the independent tester's pass and is not part of this build. The pull request stays a draft. Do not mark it ready, and do not merge it. The Sprint 18b tester follow-ups, now S18c-01 through S18c-06, stay ticketed and unbuilt and come after this sprint. Hosting stays on hold.

| Ticket | Commit | Notes |
|---|---|---|
| S21-01 Ask before a break moves open work | 860cd32, 28ef783 | Saving a break that newly covers open books opens one sheet. A partial overlap is listed ("covers 5 school days in February"). Finished, stopped, and archived books are not. A break for one child skips the other child's book. A shared book is one row, and the sheet says the end moves for everyone on it. Cancel, or closing the sheet, saves nothing. A break that covers nothing saves as it does today, with no sheet. The same sheet is used from Days off (add and edit), from first-run Add breaks (including a break she added and any holiday she ticked), from Use a template, and from the school-year shape, because that shape adds the same breaks. "Use this for the rest" fills the rows she has not answered. 28ef783 keeps a screen that never loaded the book list from looking like a family with no books. |
| S21-02 Keep the end date when a break overlaps | 90f78cc, 8717f90 | The keep save shares the confirm path with the push (90f78cc). 8717f90 is the regression that the end stays. Confirming keep on every row saves the break and sends no new end date. February has none of that book's work, and the other weeks carry it. A book that only overlaps the first week of February loses that week. Confirm stays off until every row has an answer. |
| S21-03 Move the end date when a break overlaps | 90f78cc | "Push the end back" walks that book's own school days inside the break, skipping this break and any other days off. A longer break that only overlaps one week moves the end by that week. The new end is a school day, and the daily pace stays in the same neighborhood. "A day I pick" opens on that pushed day. A later day is saved. A day inside the break is refused: "Pick a day after Feb 28, 2026." One book can keep its end while another is pushed. A minutes book keeps its minutes a day; the stored total follows the new dates. |
| S21-04 Undo a break with the schedule changes | 49c4d00 | The break and the end dates are one undo. The bar says "Added February break." or "Updated February break." A keep and a push in the same save both come back. Undo of an edit restores the break's old dates. A later change is its own undo. A break that overlapped nothing still says "Added a day off." Several breaks in one save say "Added N breaks." |
| S21-05 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-21-verification.md`. |
| S18c-06 Show whole minutes | | Docs only. Not built. Queued after Sprint 21 with S18c-01 to S18c-05. |

## Decisions

- **The question is about days this save newly takes off.** A day already inside this break, or already off for that child, is not asked about again. Shortening a break, or renaming it, saves with no sheet.
- **Keep is the plan that already runs.** The end date stays. Pages, lessons, and chapters get thicker on the days that remain. Minutes do not thicken (Sprint 20). The parent still has to pick keep.
- **Push walks school days, not calendar days.** The count is that assignment's own school days inside the break (its days, else the subject's, else the family's). The walk starts the day after the current end and skips the breaks being saved and the days already off.
- **A picked day is hers.** It must be after every break in this save that covers that book, and after the book's start. It does not have to be a school day. The field opens on the push-back day.
- **One end per book.** Two different picked days on the same book leave Confirm off: "Pick one end date for {title}." A push and a pick on the same book save the picked day and do not also add the push. "Use this for the rest" on "a day I pick" fills each remaining book with that book's own push-back day, not the date she typed on the first row.
- **The school-year shape asks too.** The tickets named Days off, first-run Add a break, and Use a template. The school-year shape adds the same kind of breaks, so it uses the same sheet. If nothing overlaps, it saves as before.
- **First-run asks when she saves.** "Add a break" only adds the break to the list. The sheet opens on Add breaks, together with any holiday she ticked. Cancel leaves that list and does not save.
- **Cancel on Days off returns to the form.** What she typed stays. Nothing is saved.
- **The undo name.** Her label is used, and "break" is added when the label does not already say it, so "February" becomes "Added February break." An unnamed break uses its start month. A save that did not go through the sheet keeps "Added a day off."

## Questions for the product owner

None of these blocked the build. Each one is the conservative reading.

1. When one book is under two breaks in the same save and she picks two different days, Confirm stays off until she picks one day. Should the later day win instead?
2. When she both pushes and picks for the same book, the picked day is the end and the push is not added on top. Is that the right mix?
3. "Use this for the rest" on "a day I pick" uses each other book's own push-back day, not the date she typed. Should it copy that date?
4. Several breaks saved together are one undo, "Added N breaks," rather than one break's name.
5. The school-year shape uses the sheet too. The tickets did not name that screen.
6. A picked day may be a Saturday or a Sunday, as long as it is after the break and after the book's start.

## Gate counts

`bash scripts/check.sh` on this branch, ALL GREEN.

| | engine | API | web | db |
|---|---|---|---|---|
| Sprint 20, after the tester fixes | 440 | 1213 | 1806 | 190 |
| Sprint 21 | 454 | 1220 | 1816 | 190 |

Engine tests also passed in the time-zone run (the same 454, seven extra passes). Web grew by the new ticket tests from 1806 at the Sprint 20 head.
