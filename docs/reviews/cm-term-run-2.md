# Charlotte Mason term run 2 (walk of docs/e2e/cm-term-run-2.md)

> Walked by an evaluator agent (Claude), driving real Chromium through Playwright, one person per saved session. It is not an independent review by a different person, and it is not a human's pace: every step was scripted, so the times below are agent times.

Screenshots: `docs/reviews/cm-term-run-2/` (390 px wide unless named; Chromium, light mode except file 11).

## How it was run

- Scratch database `hh_e2e_dev` (dropped afterwards), `npm run e2e:seed -- --reset`, API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173, both stopped afterwards. Family time zone America/Chicago, so "today" was Thursday Nov 5, 2026 on the machine clock (Nov 6 01:10 UTC) with no clock tricks.
- Phone width 390 px for most steps; 320 px for Part 3.3 and 9.2; 1280 x 800 for 7.4 and the saved cards. Light mode throughout except Part 9.1 and the saved-image check (dark). Signed in once per person (Nina for the new family, Rachel, Tom, Joan, Ed), never throttled.
- Part 1 used a new family ("Run Two family", Nina Park, `cm-new@example.com`). I lost the first printed invite link (it is shown once), so I made a second; the first stays unused in the scratch database.
- No product, test or script code was changed. Things I changed in the Hartley data along the way: an Update status on A Child's History of the World (see E1), a new Clara entry for Aesop's Fables (ended and stopped, then reopened, then finished), the Winnie-the-Pooh end moved to Dec 4, a Sick day for Wren on Nov 10, and a few log entries. This changes the counts the script quotes (books finished is 4, not 2, because I answered Geography: Africa and Aesop's Fables "Yes, finished").

## Verdict

Would a Charlotte Mason friend get through a term without help? Nearly, and I would hand it to her. I set up a new family in a few minutes, put a term's books in with Add several and a CSV, and the Year and Month pictures told me the truth every time: stopped books dashed, finished ones ticked, the Thanksgiving week washed, a thin row naming itself above the bar. The log is typed by me, never pre-filled, and my export and Term in review cards came out right on the first try. What would stall her is steering mid-term. "Update status" is the one-tap fix the app promises, and it is the one place where I could not go back: it saves without a word, has no Undo, and offers only an end date it computes itself, not the Feb 1 the late line had just suggested. The Week "Bars" and the "Days" view also disagree about a chapter that spans the week's edge, so a friend printing the sheet and reading the bar would see two different chapters. Fix E1 to E3 and I would say yes without reservation. Today it is a "yes, with a phone call about Update status".

## Score table (every step)

Works = did what it said. Confusing = worked, a parent would hesitate. Broken = did not work as written (4.4 only).

| Step | Result | Note |
|---|---|---|
| 1.1 | Works | Exact welcome wording, name/email/password only (plus a quiet "I already have a sign-in" link); made-up link gives one plain message; inputs 45 px. I could not retest a reused link on Part 1 (see above) but it reads the same in 8.5. |
| 1.2 | Confusing | Six steps, "Step N of 6", Back, no Skip on children, Finish later from step 3, dates typed read back written out. But a child added in step 2 cannot be removed or renamed there, and a duplicate name is accepted (E4). |
| 1.3 | Works | Home shows only "Add your breaks"; Hide removes it; "Show the getting-started checklist again" brings it back. (Reload on the all-set page went straight to Home.) |
| 1.4 | Works | "Nothing planned yet", no hint. |
| 2.1 | Works | "Pick at least one child" with nothing ticked; one unit for all rows; list says "about 25 min a day"; "Added 2 assignments. Undo" and "Added 1 assignment. Undo". Stale red errors stayed on screen until the next Save. |
| 2.2 | Works | Typo gives "Line 3: no subject named Histroy." and nothing imports; fixed file lists the rows then "Imported 2 assignments. Undo". The script says "no preview": there is a small list of the rows before Import (a good thing). Math 3 (110 lessons in six weeks) reads "about 165 min a day" with no warning (E9). |
| 2.3 | Works | Undo removed only the import; after leaving the screen no Undo is offered. No "undone" message afterwards. |
| 2.4 | Works | Lane badge shows "Literature"; first hint "Thicker bars..." then, after Got it, "Tap an icon in the left column..."; "Show tips again" is in Family settings. |
| 3.1 | Works | "2 assignments ended", the late line ("about 6 weeks late"), "Week 12 of 40". |
| 3.2 | Works | Fall Aug 17 to Dec 18, Spring Jan 4 to May 21, Together lane with initials, Prima Latina dashed "Stopped", Burgess ticked, absent in Spring, no crash, breaks washed (file 03). |
| 3.3 | Works | Thin rows name themselves above the bar, left-aligned; no sideways scroll at 320 (file 04). |
| 3.4 | Works | Hint uses "min a day"; bar in Clara's lane; list says the same "about 11 min a day". The hint also says "About 0.53 chapters a day". |
| 4.1 | Works | Elias only; Clara loses the late line; "heavy week for Elias"; ranges in whole units (file 05). |
| 4.2 | Confusing | Days sections match the sheets, but not the bars (E3), and Friday shows only a shorter meter, never the word "Co-op" (E10). |
| 4.3 | Confusing | One bar tap opens one sheet for the whole week; going 47 to 30 pages meant 17 taps on "One less" (no typing). One Undo for the save, week reads 30, next week 31 to 81 (thicker). |
| 4.4 | Broken | Update status saved with no confirmation and no Undo (E1), and offers no way to choose Feb 1, 2027 (E2). I made the same end-date move from Set up · Assignments instead: "Moved ... end to Feb 1. Undo", and Undo restored Dec 18. |
| 5.1 | Works | Two ended: one list with a card each; Geography: Africa "Yes, finished" saved. The script says "one thing at a time"; with two it is a list. Title then read "1 assignments ended" (E5). |
| 5.2 | Works | Not yet asks for a new end date (default Nov 12), "Moved Winnie-the-Pooh's end to Dec 4. Undo", longer bar on Year. |
| 5.3 | Works | Added Aesop's Fables ending Nov 4; it appeared as a question; "We stopped" asks "Stopped on" (default today); dashed, "Stopped", and no lines in Days from Thursday. |
| 5.4 | Works | Change, then Not ended: "Reopened Aesop's Fables." and the question came back. |
| 5.5 | Works | The "1 thing needs you" dot cleared when nothing waited. The Schedule card read "on track to finish May 21" because E1's Update status had already removed the late line. |
| 6.1 | Works | Wording, Elias 30 / Clara 30 / Wren 24, chips This week, Year, Fall, Spring, Custom dates. Records opens on the child last picked in Schedule (E12). |
| 6.2 | Works | One child shows its own number; All children shows each side by side. |
| 6.3 | Works | Everything empty; "Little" offers Little Women as a 44 px option (file 09); "5 school days, Mon-Fri". No confirmation bar after a new entry, and a second identical entry saved without a warning (E7). |
| 6.4 | Works | Mon 2 to Sat 7 chips; unticked Fri, ticked Sat: "Mon-Thu, Sat"; total went 30 to 35. |
| 6.5 | Works | "Changed Elias's log for Nov 2 to Nov 7. Undo", "Deleted ... Undo"; Undo restored. |
| 6.6 | Works | One entry per child for Nov 3; Wren's has no problem. |
| 7.1 | Confusing | CSV: wording on line 1, no empty columns, Books finished titles. Print summary: one page per child (checked in print media), but Wren has no Books finished row at all instead of "—" (E12). |
| 7.2 | Works | Week sheet and Day sheet: one page per child, white, no app bar, a Notes area, no minutes; Thanksgiving week reads "Thanksgiving week / Nothing planned this week."; Sick day reads "Tue · Sick day". |
| 7.3 | Works | Sheet and Days agree; multi-day chapters read "start", "day 2 of 3", "finish". |
| 7.4 | Works | Card shows exactly the log (31 school days, core and non-core, hours by subject, books); "Made on this device. Nothing is uploaded."; about 516 x 646 at 1280 with buttons beside (file 10). |
| 7.5 | Works | Three PNGs, each 1080 x 1350; the card stays light on a dark device. |
| 8.1 | Works | Kinds read Break, Holiday, Sick day, Day off; "Sick day" in Days and on the sheet. |
| 8.2 | Works | "Lighter by default (60%)", the skips, "What changes" says "No change to the plan." |
| 8.3 | Works | Link once with Copy link, "works once and ends in 7 days"; "Invite cancelled." |
| 8.4 | Works | Tom sees the Hartley family, no setup, "Signed in as Tom Hartley", both parents listed. |
| 8.5 | Works | Ed joined from the link; Schedule and Records only, "View only", no add or Update status; /setup sends him to Schedule; a used link shows the same plain message as a made-up one; removed with "Yes, remove" and his next visit went to sign-in. |
| 8.6 | Works | Joan: a bar opens a read-only detail; Export (CSV) and Term in review work. |
| 8.7 | Works | Co-op header "Hearth Co-op", "View only", Friday classes only; Switch back in the Account menu works. |
| 9.1 | Works | All six screens read in dark (file 11); Lilac says "Lilac is also used by Literature." |
| 9.2 | Works | No sideways scroll on Home, Days, Year, Records, Export, Term in review or Assignments at 320; controls at least 44 px (checkbox rows 44 to 60 px). |
| 9.3 | Works | Moved end date, added day off, edited a log entry: each shows its own sentence with Undo, each Undo worked, none is offered again. The day-off sentence does not say which day. |
| 9.4 | Works | Sign out went to the sign-in page; reopening and going Back showed nothing of the family. |

**Counts: 43 steps. Works 38, Confusing 4 (1.2, 4.2, 4.3, 7.1), Broken 1 (4.4).**

## Score by part

| Part | Time used (agent) | Budget | Works | Confusing | Broken | Notes |
|---|---|---|---|---|---|---|
| 1 First run, new family | about 8 min | 10 | 3 | 1 | 0 | 1.2; file 01 |
| 2 Adding books | about 4 min | 10 | 4 | 0 | 0 | CSV and undo good |
| 3 Hartley year and month | about 3 min | 8 | 4 | 0 | 0 | files 03, 04 |
| 4 Week adjustment, Update status | about 6 min | 8 | 1 | 2 | 1 | E1 to E3 |
| 5 Completion answers | about 3 min | 6 | 5 | 0 | 0 | E5 |
| 6 Logging | about 4 min | 10 | 6 | 0 | 0 | E7 |
| 7 Export, sheets, Term in review | about 4 min | 10 | 4 | 1 | 0 | file 10 |
| 8 Days off, parent, viewer, co-op | about 4 min | 10 | 7 | 0 | 0 | |
| 9 Look, 320 px, undo | about 4 min | 5 | 4 | 0 | 0 | files 11, 12 |

Total about 40 minutes against an 80 minute budget plus 5 to set up. Nothing ran over; a person reading each screen would take longer, probably the budgeted time.

## Findings

**E1. Medium. Update status saves silently and has no Undo.** Steps: Schedule · Week, pick Elias, tap A Child's History of the World, Update status, set "They got to page 250", Save (steps 4.4). The sheet closes, the late line ("about 6 weeks late") and the "Move end to Feb 1" button vanish, next week's pages move (Mon pages 253 onwards), and no bar says anything happened or offers Undo (checked for 4 seconds; the code has no undo on this flow). Expected: a bar such as "Updated A Child's History of the World to page 250. Undo", like every other change in the app, and the script's "Undo restores both".

**E2. Medium. Update status cannot move the end date to a date the parent picks, and its offers disagree with the late line.** Steps: same sheet, "Fell behind", page 205. It offers "Keep Dec 18" or "Move to Dec 21/22", while Home and Week had just offered "Move end to Feb 1, 2027" for the same book. Expected: either one clear date picker, or the same date the late line suggested.

**E3. Medium. Week "Bars" and "Days" show different units for the same week.** Steps: Schedule · Week, Elias. Bars: Gospel of Luke "chapter 16", Fabre's "chapters 12-13", Lingua Angelica "lessons 24-25". Days and the printed sheet: Gospel of Luke also has "Chapter 17 · start" on Wednesday and "day 2 of 3" on Thursday, Lingua Angelica has "Lesson 26 · start" on Friday. Expected: the bar names every chapter or lesson the week touches, or says "starts chapter 17".

**E4. Low. A child added in setup step 2 cannot be removed or renamed there, and a duplicate name is accepted.** Steps: the flow's step 2, add "Mina", leave, come back, add "Mina" again (my retried script did this); both are listed with different colours and no control. Expected: a small remove on each name before Continue, or a "You already added Mina" line. I fixed it afterwards in Set up · Children (rename), file 01.

**E5. Low. "1 assignments ended".** Steps: Home, Answer them with two ended, answer one. The sheet title becomes "1 assignments ended". Expected "1 assignment ended" (file 08).

**E6. Low. Family settings says "Can't change after you've checked in a week." under Week starts on.** Steps: after Update status and a week adjustment, open Family settings. There is no check-in any more (Sprint 9 retired it). Expected: words a parent uses, such as "Can't change once work has been adjusted", or none.

**E7. Low. A new log entry gives no confirmation, and an identical entry saves twice without a warning.** Steps: Records · Log, save Clara's Nov 2 to 6 week; the sheet closes and the entry appears, but no bar (edit and delete do show one with Undo). Saving the same week again made a second row. Expected: "Added Clara's log for Nov 2 to Nov 6. Undo", and a quiet "You already have an entry for these days".

**E8. Low. The Add assignment sheet opens with the first subject (Bible) and Lessons already chosen.** Steps: Year · +. A quick Add without opening the subject picker files the book under Bible. Expected: "Choose a subject" until the parent chooses, like Add several.

**E9. Low. No pace warning on Add several or CSV, and duplicate rows are allowed.** Steps: CSV row "Math 3, 110 lessons, Nov 9 to Dec 18" lists "about 165 min a day", the same number the single form would have warned about. Importing the same file twice made duplicate rows (Undo cleared them). Expected: the gentle pace check from the single form, or a duplicate-title note.

**E10. Low. Days view small gaps.** Friday shows a shorter meter but never the word "Co-op" (the Bars view names "Fri · Co-op Friday (fall)"); "Lesson 26 · start" is capitalised while "lesson 25" is not; the Nature walk lines show no amount (the bars say "71 minutes"). Expected: name the co-op on its day and keep one style.

**E11. Low. Wren (Tuesday to Friday in the log) has Monday work on Days and the sheet.** Steps: Week · Days, Wren, Mon Nov 2: The Hobbit, Gospel of Luke. The app holds school days for the family, not for a child, so a four-day child's sheet lists Monday. Expected: either per-child days or a note that Wren is off Mondays; I do not know whether the seed or the app is the intended source of the four days.

**E12. Low. Records and print summary details.** Records opens on the child last picked in Schedule (I opened it on Clara and almost read her total as the family's). Print summary leaves out the Books finished row for a child with none (Wren) instead of the script's "—". Expected: Records always opens on All children, and a dash where there is nothing.

**E13. Low. Small layout slips at 390 px.** The "All children" chip is cut ("All childre") when a child is selected on Week (file 05); in the Update status sheet a long title pushes the close "×" onto its own line (file 07); the new-family Year view washes two weeks with no word (Three terms put Nov 9 to 22 off), which is true but unexplained.

### Script notes (not product bugs)

Part 2 says "sign in as Rachel" but adds work to the new family: Rachel cannot reach it, so I used Nina's login. 2.2 says "no preview", but a row list appears. 4.4 asks for a free end date in Update status (see E2). 5.1 says "one thing at a time" but two ended assignments appear as a list. 7.1 says tick "Books finished": it is ticked by default with Totals. Counts in 6.1 and 7.1 shift as soon as you answer completion questions.

## Moments of delight

1. Add several and CSV. One range, one unit, three titles, and "Added 2 assignments. Undo"; a CSV typo says "Line 3: no subject named Histroy." and imports nothing.
2. The Fall and Year pictures (file 03): dashed "Stopped", a tick on a finished book, the washed Thanksgiving week, and no crash in Spring.
3. Thin rows in the month view name themselves in a small line above the bar (file 04).
4. Typing "Little" in the log offers Little Women, as a comfortable 44 px row (file 09).
5. Term in review at 1280 (file 10): the keepsake card, three 1080 x 1350 images, "Made on this device".

## Moments of friction

1. Update status: silent, no Undo, no free end date (E1, E2).
2. Bars say chapter 16, Days say 16 and 17 (E3).
3. Going from 47 to 30 pages takes 17 taps on "One less" (4.3), and the sheet opens on the whole week, not on the bar I tapped.
4. Setup step 2: no way to take back a name (E4).
5. Confirmations are uneven: a new log entry says nothing, Undo says nothing afterwards (E7).

## Screen tests (DESIGN_DIRECTION.md)

Five seconds, one job, no duplicates, parent's words, empty state, phone first: Pass on Home, Year, Month, Records, Term in review, setup flow, Completion question, Print sheets, Family settings (except E6) and the viewer screens. Partial: Week "Update status" (E1 to E3, parent's words in "One less"), Add assignment sheet (E8). No screen failed outright.
