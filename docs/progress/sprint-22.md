# Sprint 22 progress: each child on a shared book has their own end

Branch: `hh2/sprint-22`, cut from `main` at the Sprint 18c merge (`664682d`, PR #24). Tickets: `docs/tickets/sprint-22-per-child-end/`. S22-10 is the independent tester's pass and is not part of this build. The pull request stays a draft. Do not mark it ready, and do not merge it. Hosting stays on hold.

Sprint 18c is merged (PR #24). Sprints 19, 20, and 21 are merged (PRs #21, #22, and #23).

| Ticket | Commit | Notes |
|---|---|---|
| Tickets | ecb81a4 | S22-01 to S22-10. S22-10 is not this build. |
| S22-01 Copy each child's end from the book | 57a3dcf | Migration 029 copies the book's end and ending onto every child. A save of the book's end or ending still updates every child. A child added to the book starts on the book's current end and ending. |
| S22-02 Plan each child to their own end | 847489b | Engine 0.16.0. A child row plans that child. A copied row matches today's plan. A minutes book keeps its minutes a day when one end is shorter. |
| S22-03 Change one child's end | 79a86af | `childEnds` names the children. No name still updates everyone. The form defaults to For everyone when the ends match. Undo stores each child's end. |
| S22-04 Ask whether one child finished | 912be44 | One question per child. Yes, Not yet, and We stopped name that child. Change offers For everyone when they still share an ending. |
| S22-05 Update status for one child | 0b3a719 | The end saved from Update status names the child. Just {name} is the default. For everyone is the other choice on a shared book. |
| S22-06 Keep one year bar while the ends match | (this commit) | One Together bar while planned ends and endings match. Otherwise each child has a bar in their own group. |
| S22-07 Ask about a break for each child's end | | |
| S22-08 Undo restores each child's end | | |
| S22-09 Read each child's end everywhere else | | |
| S22-10 Tester pass | | Not this build. The independent tester writes `docs/reviews/sprint-22-verification.md`. |

## Decisions

The conservative reading, so none of these block the build. DeeDee can change any of them.

- **Nothing changes until a parent changes one child.** The migration copies the book's end and ending onto every child. Saves that do not name a child still update every child.
- **The book's stored end, once children differ, is the latest child's end.** The book still covers the longest run. The book's ending is stored only when every child has the same ending. Otherwise the book reads as open, and each child's ending is on their row.
- **A child added to a forked book starts on that latest end.**
- **"For everyone" on the assignment form is the default when the ends match.** "Just {name}" is visible and is not selected. When the ends already differ, the form opens on each child's date, and "For everyone" is still there. "For everyone" moves the planned end and does not clear a finish or a stop.
- **The finish question is one child.** "Did Elias finish Treasure Island?" Several questions still use "N assignments ended", and N counts questions, so two children on one book count as two.
- **Update status defaults to the child whose bar was opened.** "For everyone" is the other choice.
- **Changing an answer later:** when every child shares one ending, "For everyone" is the default. When the endings differ, Change on a child's line changes that child.
- **Year view:** one Together bar when every child's planned end matches and their ending matches (all open, or all finished on the same drawn end, or all stopped on the same drawn end). Otherwise each child has their own bar in their own group. A check-in that does not change the stored end does not split the bar.
- **A break while the open children share an end is still one row,** and the end moves for every open child. When the ends differ, one row per open child. A finished or stopped child is not a row and is not moved. "Use this for the rest" uses each row's own push-back day. A picked day is still a family school day. One break per save.
- **Minutes stay a daily amount.** The stored total follows the longest child's span. A shorter child's plan places that daily amount on their own days.
- **Other copies** treat the book as running through its latest child's end. A copy that overlaps only the longer child still counts as the same time.
- **Books finished.** A child's card includes a book that child finished. All children includes a shared book once, only when every child on it has finished, on the latest of those days.
- **An undo from before this sprint** has no per-child rows. Restoring it sets every child from the book's end and ending.

## Questions for the product owner

None that blocked the build. Each one above is the default that was built. DeeDee can change any of them.

## Gate counts

Filled in when `bash scripts/check.sh` is ALL GREEN.
