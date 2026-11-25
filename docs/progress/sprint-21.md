# Sprint 21 progress: a break that overlaps assignments

Branch: `hh2/sprint-21`, cut from `main` at the Sprint 20 merge (`b0f3f56`, PR #22). Draft pull request: https://github.com/willMolloy/Homeschool-Hub/pull/23. Tickets: `docs/tickets/sprint-21-break-overlap/`. S21-05 is the independent tester's pass and is not part of this build. The pull request stays a draft. Do not mark it ready, and do not merge it. The Sprint 18b tester follow-ups, now S18c-01 through S18c-06, stay ticketed and unbuilt and come after this sprint. Hosting stays on hold.

| Ticket | Commit | Notes |
|---|---|---|
| S21-01 Ask before a break moves open work | 860cd32, 28ef783, 4727cbe | Saving a break that newly covers open books opens one sheet. A partial overlap is listed ("covers 5 school days in February"). Finished, stopped, and archived books are not. A break for one child skips the other child's book. A shared book is one row, and the sheet says the end moves for everyone on it. Cancel, or closing the sheet, saves nothing. A break that covers nothing saves as it does today, with no sheet. Days off, first-run, Use a template, and the school-year shape each save one break (4727cbe). "Use this for the rest" fills the rows she has not answered. 28ef783 keeps a screen that never loaded the book list from looking like a family with no books. |
| S21-02 Keep the end date when a break overlaps | 90f78cc, 8717f90 | The keep save shares the confirm path with the push (90f78cc). 8717f90 is the regression that the end stays. Confirming keep on every row saves the break and sends no new end date. February has none of that book's work, and the other weeks carry it. A book that only overlaps the first week of February loses that week. Confirm stays off until every row has an answer. |
| S21-03 Move the end date when a break overlaps | 90f78cc, 4727cbe | "Push the end back" walks that book's own school days inside the break, skipping this break and any other days off. A longer break that only overlaps one week moves the end by that week. The new end is a school day, and the daily pace stays in the same neighborhood. "A day I pick" opens on that pushed day. A later day is saved only when it is a family school day, after the break and after the book's start (4727cbe). A day inside the break is refused: "Pick a day after Feb 28, 2026." A weekend says "Pick a school day." A day already off says "That day is already off. Pick a school day." One book can keep its end while another is pushed. A minutes book keeps its minutes a day; the stored total follows the new dates. |
| S21-04 Undo a break with the schedule changes | 49c4d00, 4727cbe | The break and the end dates are one undo. The bar says "Added February break." or "Updated February break." A keep and a push in the same save both come back. Undo of an edit restores the break's old dates. A later change is its own undo. A break that overlapped nothing still says "Added a day off." There is no "Added N breaks" undo, because a save is one break (4727cbe). |
| S21-05 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-21-verification.md`. |
| S18c-06 Show whole minutes | | Docs only. Not built. Queued after Sprint 21 with S18c-01 to S18c-05. |

## Decisions

- **The question is about days this save newly takes off.** A day already inside this break, or already off for that child, is not asked about again. Shortening a break, or renaming it, saves with no sheet.
- **Keep is the plan that already runs.** The end date stays. Pages, lessons, and chapters get thicker on the days that remain. Minutes do not thicken (Sprint 20). The parent still has to pick keep.
- **Push walks school days, not calendar days.** The count is that assignment's own school days inside the break (its days, else the subject's, else the family's). The walk starts the day after the current end and skips the breaks being saved and the days already off.
- **A picked day is a family school day.** It must be after the break and after the book's start. It must also be one of the family's school days: not a weekly day off, and not a day already off (this break or another). The field opens on the push-back day. Confirm stays off until the day is valid. The API refuses the same cases.
- **One break per save.** DeeDee, after the first build: add one break, then keep or move the end date for that break. Days off already saved one. First-run lists each holiday with its own Add, and "Add a break" saves that one break. Use a template lists the breaks and Add saves the one she clicked; Done closes the panel. The school-year shape stores the year and the term views, and each suggested break has its own Add. Saving the year does not create the breaks. A bulk save that also sends end-date changes for more than one break is refused: "Add one break at a time."
- **Use this for the rest.** Confirmed by DeeDee. It fills each remaining book with that book's own push-back day, not a date she typed on the first row.
- **Cancel on Days off returns to the form.** What she typed stays. Nothing is saved.
- **The undo name.** Her label is used, and "break" is added when the label does not already say it, so "February" becomes "Added February break." An unnamed break uses its start month. A save that did not go through the sheet keeps "Added a day off."

## Questions for the product owner

DeeDee answered these on the review of the first build. None are still open.

1. Two picked days for one book across two breaks in one save. **Closed.** A save is one break, so the case does not arise.
2. A push and a pick for one book across two breaks in one save. **Closed.** Same reason.
3. "Use this for the rest" on "a day I pick". **Confirmed.** Each remaining book uses its own push-back day, not the date she typed.
4. Several breaks in one undo, "Added N breaks." **Closed.** Each break is its own save and its own undo.
5. The school-year shape. **Closed.** It still offers the shape's breaks, and each one is added by itself. Saving the year does not add them.
6. A picked day on a weekend. **Closed.** Only a family school day is allowed, and not a day that is already off.

## Gate counts

`bash scripts/check.sh` on this branch, ALL GREEN.

| | engine | API | web | db |
|---|---|---|---|---|
| Sprint 20, after the tester fixes | 440 | 1213 | 1806 | 190 |
| Sprint 21, first build | 454 | 1220 | 1816 | 190 |
| After one break at a time | 455 | 1221 | 1817 | 190 |

Engine tests also passed in the time-zone run (the same 455, seven extra passes).
