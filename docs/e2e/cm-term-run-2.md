# Charlotte Mason term run 2 (walk script)

A step-by-step walk through a Charlotte Mason term with the Hartley family from `npm run e2e:seed` (S17-03). A person or an agent walks it; each step says what to do and what to check. The first run was the Sprint 7 run (`docs/reviews/cm-term-run.md`); this one covers what has been built since: the setup flow, Add several and CSV, completion questions, Days, Records, Term in review, a second parent, viewers, a co-op and undo.

**Time:** about 80 minutes if nothing breaks. The time next to each part is a budget; if a part runs over by half, note it in the score table and move on.

## Before you start (5 minutes)

1. Postgres 16 is up and `.env` points `DATABASE_URL` at a `*_dev` database (the seed refuses any other name).
2. Build the family on a fresh database and start the servers on this machine only:

   ```sh
   npm run e2e:seed -- --reset      # wipes that dev database; prints four logins at the end
   npm run dev:api                  # 127.0.0.1:3000   (one terminal)
   npm run dev:web                  # 127.0.0.1:5173   (another)
   ```
3. Open http://127.0.0.1:5173 in a **phone-width window (390 px)** first; use a laptop width (1280 px) where a step says so. Keep the window in light mode, and switch to dark once, in Part 9.
4. The logins the seed printed (local, throwaway):

   | Who | Email | Password |
   |---|---|---|
   | Rachel, first parent | `cm-rachel@example.com` | `cm-run-rachel-1` |
   | Tom, second parent (also a viewer of the co-op) | `cm-tom@example.com` | `cm-run-tom-1` |
   | Grandma Joan, viewer of the family | `cm-grandma@example.com` | `cm-run-joan-1` |
   | The co-op lead (parent of Hearth Co-op) | `cm-coop@example.com` | `cm-run-coop-1` |

5. Today in the family is **Thursday Nov 5, 2026**, Week 12 of 40. Nothing is sent anywhere: no email, no hosting. Do not use real names, addresses or passwords.

**What the seed gives you.** Children Elias (13), Clara (10), Wren (7, Tuesday to Friday). Fall is Aug 17 to Dec 18 and Spring Jan 4 to May 21; Thanksgiving week (Nov 23 to 27) and a Christmas break are off; Friday is co-op. 30 assignments; six weeks of log entries (Sep 21 to Oct 30), none yet for the week of Nov 2. Two finished early (Robinson Crusoe, Burgess Bird Book), one stopped (Prima Latina), one running late (A Child's History of the World, Elias), and two ended and waiting for an answer (Geography: Africa, Winnie-the-Pooh).

## Part 1: A brand-new family's first run (10 minutes)

The seeded family has already set up, so this part uses a second, new family. Make its sign-up link on the command line (it prints the link once; nothing is emailed):

```sh
npm run create-family-invite -w @hh/api
```

| # | Do | Check |
|---|---|---|
| 1.1 | Open the printed link in a **private window** (so Rachel stays signed in elsewhere). Create a sign-in: a name, `cm-new@example.com`, a password of your own for this run. | The page says "Welcome. Make your sign-in, then we will set up your family together." and asks for name, email, password and nothing else. A wrong or reused link shows one plain message. 44 px targets. |
| 1.2 | Walk the six setup steps: step 1 the family name ("Run Two family") and the day the week starts; step 2 **two children, names only** (Mina, Jory; there is no age); step 3 the school days (Mon to Fri); step 4 the school year (type "Aug 17, 2026" and "May 21, 2027", choose Three terms or Fall and spring); step 5 breaks (put them off once: "I'll get back to you on this"); step 6 subjects (tick Math, Literature, History). | "Step N of 6" with a progress bar; Back works from step 2; children have no Skip; Finish later shows from step 3. Typed dates read back written out. |
| 1.3 | After step 6 an "You're all set" page appears: tap **Go to Home**. | The only reminder on Home is "Add your breaks" (and nothing about books). Tap Hide on the list, then find it again in Family settings: **"Show the getting-started checklist again"**. |
| 1.4 | Open Schedule · Year. | With no assignments yet it says "Nothing planned yet" and shows **no hint**. (The hints are checked in 2.4 once a book exists.) |

Leave that window; switch back to Rachel for everything else.

## Part 2: Adding the term's books (10 minutes)

Sign in as **Rachel**. This part adds work to the *new* family from Part 1, as a parent would at the start of a term (it has two children and three subjects). If you are short of time, do 2.1 and 2.3 only.

| # | Do | Check |
|---|---|---|
| 2.1 | Set up · Assignments · **Add several**: tick **Mina** (no child is pre-ticked: without one it says "Pick at least one child"), choose Literature, one date range and **one Unit for all the rows**, pages. Add two books by title and amount ("Heidi, 300" and "Black Beauty, 250"). Then do a second pass for chapters ("Little Britches, 24"). | Each row has its own title and amount; the list shows "about N min a day" in parent words; the new rows are listed; the bar at the bottom says "Added 2 assignments. Undo" (and again after the second pass). |
| 2.2 | **Import CSV**: download the template (columns, in this order: `subject,title,children,unit,total,start,end`; children come before unit), add two rows (Math "Math 3", 110 lessons; History "Story of the World", 40 chapters) and one deliberate typo in a subject name, upload. | There is no preview: with an error it lists line-numbered messages and **nothing** is imported; after the fix, Import adds the rows ("Imported 2 assignments. Undo"). |
| 2.3 | Tap **Undo** in the bar straight after the import (before leaving the screen). | The imported rows disappear; the earlier books stay. (If you have already moved on, check whether the bar is still offered and note it.) Then re-import the fixed file. |
| 2.4 | Open the Schedule · **Year** view. | Bars sit in lanes by subject, calm, no number a parent did not type. Tap a lane badge: the full subject name shows. Now the first hint ("Thicker bars mean more work each day") appears with **Got it**, one at a time; Family settings has "Show tips again". |

## Part 3: The Hartley year and month (8 minutes)

Sign out, then sign in as **Rachel** (`cm-rachel@example.com`). Home opens on the Hartley family ("H" in the corner; Rachel's own family, not the co-op).

| # | Do | Check |
|---|---|---|
| 3.1 | Read Home. | "2 assignments ended: Winnie-the-Pooh and Geography: Africa", a late line ("A Child's History of the World will finish about 6 weeks late at this pace"), and the Schedule and Records cards. Greeting says "Week 12 of 40". |
| 3.2 | Schedule · **Year**, All children. Try Year, **Fall**, **Spring** and **This month**. | Fall reads Aug 17 to Dec 18 and Spring Jan 4 to May 21. Together (shared) work is its own lane with the children's initials. In Fall, Prima Latina is dashed and says "Stopped" and Burgess Bird Book carries a check. In **Spring** both are simply absent (they ended in the fall), and the page does not crash; Clara's and All children's Spring view show only the spring work. Thanksgiving week and the Christmas break are washed. |
| 3.3 | This month (November): look for a thin row. | A row whose blocks are too narrow for a name shows its name on a small muted line just above it, left-aligned with the first block. Nothing is cut off at 320 px (make the window that narrow once). |
| 3.4 | Add an assignment with the **+**: "The Wind in the Willows", Clara, chapters, 12, Nov 9 to Dec 18. | The form's "About how long" hint uses minutes a day; the bar appears in Clara's lane; the pace text matches the list. |

## Part 4: A week adjustment and Update status (8 minutes)

| # | Do | Check |
|---|---|---|
| 4.1 | Schedule · **Week** (Nov 2 to 8). Pick **Elias**. | The briefing shows only Elias's lines (switch to Clara: his late line goes away). "This is a heavy week for Elias." The bars show ranges in whole units ("pages 201 to 220", "chapters 12 to 13"). |
| 4.2 | Toggle **Days**. | One section per school day, lines match the bars; Friday shows the co-op as a lighter day; under All children each day has a heading per child and a Together heading. |
| 4.3 | Tap Elias's **Treasure Island** bar: Make an adjustment. Change pages 1 to 47 to 30 and keep the end date; Save. | One Undo for the whole save. The week now reads 30; next week is a little thicker. |
| 4.4 | On the late book **A Child's History of the World**, tap **Update status**: "They got to page 250", move the end to Feb 1, 2027. | The late line goes away or changes; the end date reads Feb 1, 2027 on the Year view. Undo restores both. |

## Part 5: Completion answers (6 minutes)

| # | Do | Check |
|---|---|---|
| 5.1 | Home: **Answer them**. For *Geography: Africa* choose **Yes, finished**. | It asks one thing at a time, in plain words; the bar on Year gets its check. |
| 5.2 | For *Winnie-the-Pooh* choose **Not yet**. | It moves the end later and keeps the assignment open; Year shows the longer bar. |
| 5.3 | Pick any other ended-but-open assignment you can find on Year (or add one ending yesterday) and choose **We stopped**. | It is dashed with "Stopped"; it has no lines in Days after its last day. |
| 5.4 | Change an answer from Set up · Assignments (Change, then Not ended). | It waits for an answer again if its end has passed. |
| 5.5 | Home's "needs you" dot and Schedule card. | The dot clears when nothing is waiting; the card still counts the late book as running late until it is dealt with. |

## Part 6: Logging a week (10 minutes)

| # | Do | Check |
|---|---|---|
| 6.1 | Records. | "Your log tracks core and non-core hours, school days, notes and books read." Totals for the year: Elias 30, Clara 30, Wren 24 school days (Wren is Tuesday to Friday); core hours, non-core hours, books finished 2. Range chips: This week, Year, Fall, Spring, Custom. |
| 6.2 | Choose **Fall**, then each child. | One child's card shows that child's own number; "All children" shows each child's school days side by side, never "0" for a child with none. |
| 6.3 | **Log** a week for **Clara**: first day Nov 2, last day Nov 6 (leave the school days as they are), Math 3 h 20 m, Literature 2 h 30 m, Copywork 1 h 10 m, a note, and as the book type "Little" and pick Little Women from the suggestions. | The date and every hours box start empty; nothing is pre-filled; the suggestion list appears with 44 px options; the entry saves and the list shows "5 school days". |
| 6.4 | **Log a run of days** for **Elias**: Nov 2 to Nov 7 (the Saturday), untick Friday, so Saturday is the catch-up. | The days are ticked individually; the saved entry says "5 school days" and shows the days; Records totals go up by five, not six. |
| 6.5 | Edit that entry (change Math), then Delete it, then use **Undo**. | Each change shows in the bar; the schedule never changes. |
| 6.6 | Log one day for **all three** children, Nov 3: "Co-op field trip". | One entry per child is made; Wren's has no school-day problem. |

## Part 7: Export, sheets and Term in review (10 minutes)

| # | Do | Check |
|---|---|---|
| 7.1 | Records · **Export**: dates Aug 17 to Dec 18, all children, **Totals**, tick Books finished. | **Download CSV** has the wording on line 1, no empty columns, a Books finished column of titles. **Print summary** previews one page per child, with "—" (not 0) where a child has none. |
| 7.2 | Schedule · Week · **Print sheets**: Week, All children; then Day, Nov 5. | One sheet per child, no app bar, white, a notes area, no minutes or effort words; days off and breaks use the same names as the Days off screen ("Break", "Day off", "Holiday"). Back returns to Schedule. |
| 7.3 | Check the sheet against **Days**: the same lines for each child and day. | They agree. A chapter that takes several days reads "Chapter 3 · start", "day 2 of 3", "finish". |
| 7.4 | Records · **Term in review** for Fall. Swipe or use the arrows between children. At **1280 x 800** look again. | The card shows exactly what the log tracks (school days, core and non-core hours, hours by subject, books read), nothing from the schedule; "Made on this device. Nothing is uploaded." At 1280 x 800 the card is large (about 500 x 640) with the buttons beside it. |
| 7.5 | **Save image** and **Print**. | One 1080 x 1350 PNG per child; the printed card is light even on a dark device. |

## Part 8: Days off, events, a second parent, a viewer and the co-op (10 minutes)

| # | Do | Check |
|---|---|---|
| 8.1 | Set up · Days off. Add "Sick day" (kind **Sick day**, no label) for Wren on Nov 10. | A label-less break reads by its kind everywhere: "Sick day" here, on the sheet and in Days. The Kind list reads Break, Holiday, Sick day, Day off. |
| 8.2 | Set up · Events: open "Co-op Friday (fall)". | It reads "Lighter by default (60%)" and the skips; the preview says what changes before you save. Cancel. |
| 8.3 | Family settings · Parents: **Invite another parent**, then Cancel the open invite. | The link is shown once with Copy and "single use, 7 days"; Cancel says "Invite cancelled." (If you are throttled, the message is "Too many tries. Please wait a minute and try again.", not a generic save error.) |
| 8.4 | Tom is already a parent. Sign in as **Tom** in a private window. | He sees the same family, no setup flow, and "Signed in as Tom" in the family menu. Both parents are listed. |
| 8.5 | As Rachel: Family settings · **View-only access**, make a sign-up link labelled "Grandpa Ed"; open it in a private window; join as `cm-grandpa@example.com`. | The link works once for 7 days; the join page says nothing can be changed; the viewer sees Schedule and Records only, with "View only", no edit control, and the same Days, Records cards and Term in review. A used link shows the same plain message as a made-up one. Remove him afterwards (Remove). |
| 8.6 | Sign in as **Grandma Joan**. | Only Schedule and Records; a bar opens a read-only detail with only Close; Export and Term in review work. |
| 8.7 | Sign in as **Tom**, open the family menu, **Switch to Hearth Co-op**. | The co-op is read-only for him ("View only", its name in the header), shows Friday classes only, and Switch back returns to the Hartley family. (Leave is also offered there; do not use it, or he must be invited again.) |

## Part 9: Look and undo (5 minutes)

| # | Do | Check |
|---|---|---|
| 9.1 | Switch to **dark** (Family settings · Appearance) and open Home, Week, Year (This month), Records, Term in review. | Everything reads; Rose and Lilac swatches are easy to tell apart on Set up · Subjects, and a swatch another subject uses says so in words ("Lilac is also used by Literature."). |
| 9.2 | At **320 px**, open Home, Week (Days), Year, Records, Export, Term in review. | No sideways scroll anywhere; every button is at least 44 px. |
| 9.3 | Make three changes in a row (move an end date, add a day off, edit a log entry); Undo after each. | Each Undo names the change it reverses; the last one stops being offered after it is used. |
| 9.4 | Sign out; reopen the app. | The session is the parent's own; nothing from another account shows. |

## Score

Fill in one row per part: **Works** (did what it said), **Confusing** (worked but a parent would hesitate; say where), **Broken** (did not work or showed the wrong thing; steps to repeat it). Like the Sprint 7 run, note anything that took more than twice its budget.

| Part | Time used | Works | Confusing | Broken | Notes (step numbers, screenshots) |
|---|---|---|---|---|---|
| 1 First run, new family | | | | | |
| 2 Adding books (Add several, CSV, undo) | | | | | |
| 3 Hartley year and month | | | | | |
| 4 Week adjustment, Update status | | | | | |
| 5 Completion answers | | | | | |
| 6 Logging a week and a run of days | | | | | |
| 7 Export, sheets, Term in review | | | | | |
| 8 Days off, parent, viewer, co-op | | | | | |
| 9 Look, 320 px, undo | | | | | |

**Overall:** would a Charlotte Mason parent run a real term this way? Write three sentences: what was easy, what slowed you down, and the one thing to fix first.

**Findings** (one line each: step, what you saw, what you expected, severity High / Medium / Low):

1.
2.
3.

When you are done, stop both servers and, if you like, drop the dev database with `npm run db:reset` (it also removes the family).
