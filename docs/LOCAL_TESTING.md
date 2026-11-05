# Local testing: Sprints 5–8b (Soft Paper)

A checklist for Will and DeeDee to try PR #3 on your own machine. Setup is the same as [REVIEW-GUIDE.md](REVIEW-GUIDE.md) section 1 (Node 20, Docker for Postgres, `.env` with a `SESSION_SECRET`):

```sh
git fetch origin && git checkout claude/test-coverage-analysis-6dehbu
docker compose up -d db
npm ci
npm run demo          # resets hh_dev to the demo family, starts API + web
```

Open http://localhost:5173 and sign in with `demo@example.com` / `demo-password`. Try a laptop-width window and a phone-width one (browser dev tools → device toolbar → 360 px).

**Testing on your real phone (optional, home Wi-Fi only):** the API and web listen on 127.0.0.1 only, so a phone can't reach them. Ask Claude for the one-off LAN command if you want this; nothing is made public.

## Checklist

**Home**
- [ ] In five seconds, can you tell what the app is for and what to do next?
- [ ] The tabs at the bottom (Home · Schedule · Records) are clear, and Home is always one tap away.

**Schedule · Week**
- [ ] The pastel bars show this week's work; ranges match where each book really is.
- [ ] Tap a bar: the week adjustment opens. Change it, then Undo from the bar at the bottom.
- [ ] In that sheet, "Update status" on a row ("They got to p. 138", keep or move the end date) corrects the plan's pace.

**Schedule · Year**
- [ ] Bars are calm when zoomed out; no bar fills the screen.
- [ ] Tap a subject badge in the left gutter: the full name shows and its lane highlights.
- [ ] Tap a bar: the edit bar (Start, End, Copy, More) sits above the tabs, on phone and laptop.
- [ ] More → Update status and More → Update time estimate open for the selected bar.

**Records**
- [ ] A new family sees "Set up your log": pick a style (Hours by subject, Core and non-core hours, Days attended, Days and hours, Detailed log), adjust the switches, mark subjects core or non-core. No state is named.
- [ ] Log: the date, the children and every hours box start empty; "Count as a school day" is on; hours are typed as hours and minutes. Log one week for two children: each child's record shows its own entry.
- [ ] Records shows the range (This week, Year, Fall, Spring, your terms, custom dates), the big numbers for what you track, hours by subject, and the wording "Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules."
- [ ] Edit and Delete an entry; Undo from the bar at the bottom. The schedule never changes.
- [ ] Export: pick dates, children, Each entry or Totals and the columns; Download CSV opens in a spreadsheet with no empty columns and the wording on line 1; Print summary previews one page per child.

**Child switch** (Week, Records, Year)
- [ ] "All children" comes first; picking a child on one screen carries to the others.
- [ ] Narrow the window: when names don't fit, it becomes one "All children ▾" button with a list.

**Set up**
- [ ] Subjects, children, assignments, days off, events read cleanly; each subject has one colour and an icon everywhere.
- [ ] Add an assignment: the subject list offers common subjects and "New subject…".

**Look**
- [ ] Light and dark both feel calm (Family settings → Appearance, or your device setting).
- [ ] Anything that still looks "2013", cluttered, or shows a number a parent wouldn't use.

**A brand-new family, the first run (Sprint 11):** after `npm run demo`, run `DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts` (local only; the demo reset wipes it, and running it again gives you a fresh family again). Sign out, then sign in as `fresh@example.com` / `demo-password`: it opens the setup flow at step 1. Existing logins (the demo, `smoke@example.com`, `empty@example.com`) never see it.
- [ ] Six steps, one question each, "Step N of 6" with a progress bar, and Back from step 2. Step 2 (children) has no Skip and no Finish later; "Finish later" shows from step 3 and takes you Home; sign out and in again and the flow reopens at that step.
- [ ] Step 4: type the year's first and last day (like "Aug 17, 2026" and "May 21, 2027"), pick Three terms: the line says what it adds. After the flow, Schedule · Year shows Term 1, 2 and 3 on its zoom row and Set up → Days off lists the break weeks.
- [ ] Step 5: tap "I'll get back to you on this"; after the last step, Home shows only "Add your breaks" (and "Set your school year" if you chose "I'll set this later" in step 4), and each opens that step on its own.
- [ ] Step 6: tick Math and Literature; they appear under Set up → Subjects with their icons. Nothing asks you to add a book or lesson.
- [ ] Schedule · Year with some work shows one hint at a time ("Thicker bars…", then "Tap an icon…", and "Change the start or end…" the first time you open a bar), each with Got it. Family settings → Show tips again brings them back (the demo and the other seeded families have seen them already).
- [ ] 320 px and dark mode: nothing scrolls sideways and every button is easy to tap.

**"Did Frank finish…?" and the needs-you dot (Sprint 12):** the demo family (`demo@example.com`) has one question waiting on Nov 4, 2026 and later: "Did Margaret finish A Child's Garden of Verses?" (the older demo books were already answered as finished). To answer without touching the demo, use `smoke@example.com` after the seed script above (run it again for a fresh set). Scenario: `node flow.mjs completion` (scripts/smoke) adds two assignments that ended yesterday, answers Yes / Not yet / We stopped from Home, and checks the dot, Year and axe.
- [ ] Home: the question card is first, above the briefing; on a wide screen it spans both panes. **Yes, finished saves at once** (the undo bar says "Marked … finished"); Not yet and We stopped open a small sheet with the day (Oct 30 style) and Save; Cancel changes nothing. A book finished two weeks early ends its Year bar that day and the weeks after it are lighter.
- [ ] Several waiting: one card "N assignments ended" with Answer them; each answered row leaves the list; the card goes after the last.
- [ ] The Home item on the bar (phone) and the rail (600 px and up) shows a small green dot while a question waits, and is named "Home, 1 thing needs you" (2 things need you). It is green, never red, and clears the moment the last question is answered, without a reload. A late line or a heavy week never lights it.
- [ ] Undo ("Marked … finished. Undo") puts the question and the dot back.
- [ ] Schedule · Year: a finished bar is lighter with a check after its name; a stopped bar is muted, dashed, and says "Stopped"; opening it shows "Finished Nov 2" / "Stopped Oct 30" with Change (Yes, Not yet, We stopped, Not ended). Not ended brings the bar back and, if its end has passed, the question.
- [ ] Nothing about a finished or stopped assignment shows in the briefing, in Week after it ended, or in Records.
- [ ] 320 px and dark mode: nothing scrolls sideways and every button is easy to tap.

## Known and accepted
- Year badges are 24 px wide by design (each has a 32 px+ tall tap area).
- The setup forms' calendar pop-up and number steppers from the mockup are not built yet (forms behave as before).
- Art and Math are both mint in the demo (their stored colours map to the same swatch); icons tell them apart.
- A date placeholder clips its last letter at 360 px.

Write anything you notice in a list; Claude will turn it into tickets.

**Printable sheets and term in review (Sprint 13):**
- [ ] Schedule · Week: a printer button ("Print sheets") at the end of the title row. It opens a sheet: Week or Day, the week (arrows) or the day, All children or any mix. Print opens a white page with no bar or rail: one sheet per child, "‹ Back" and "Print" on screen only. Check Print preview (Ctrl/Cmd+P) in US Letter and A4: one page per child, the ranges ("Mon · chapters 16–17") match this week's Week bars, no minutes anywhere, Piano practice (counted in minutes) shows its days with a box and no number.
- [ ] Day: the demo family's Tuesday shows only Tuesday's work for each child; Margaret's Math (Mon, Wed, Fri) is missing on Tuesday, and a day off says "Nothing planned for Thursday" with the break's name.
- [ ] Records (set up the log first for the full card; the demo family has no log entries, so its card shows finished work only): **Term in review** after Export opens a full-screen page on the range and child you had. Range chips, the child switch, the card as large as fits, arrows between children's cards, Print and Save image at the bottom ("Save 2 images" with All children).
- [ ] Save image: on a phone the share sheet offers the picture(s); on a computer each downloads as `Frank-Fall-2026-term-in-review.png` (1080 x 1350). In dark mode the screen shows a dark card but the saved picture and the printed page are light. Nothing is uploaded.
- [ ] A part with nothing in it (no books, no time, nothing finished) is absent from the card, never 0. A long list ends in "and N more".
- [ ] 320 px and dark mode: nothing scrolls sideways and every button is easy to tap. Scenarios: `node flow.mjs sheets` (demo family, read-only) and `node flow.mjs term-review` (smoke@example.com after the seed script; it sets up a log and adds entries).

**Accounts, and undo for Add several and CSV import (Sprint 14):** run `npm run demo` first. Nothing is emailed or sent anywhere; you copy the links yourself.
- [ ] **Make a new family's invite on this computer:** from the repo root, `npm run create-family-invite -w @hh/api`. It prints one link like `http://localhost:5173/join/…` (shown once; `-- list` shows open invites without links, `-- revoke <id>` cancels one). Open it in a private window.
- [ ] The join page asks for your name, email and a password (8 characters). Creating it lands you on "What should we call your family?" (the first-run flow) and the family menu on Home says "Signed in as {your name}". Open the same link again: "This invite link has expired or was already used. Ask the person who sent it for a new one." A made-up link, a cancelled one and an old one say exactly the same.
- [ ] Set up → Family settings → **Parents**: your name with "(you)", **Invite another parent** shows a link in a box (Copy link; Share on a phone). Open it in another private window, join with another email: that parent lands on Home (no setup flow) and sees the same children, subjects and assignments. Back in the first window, reload: both names are listed; the used invite is gone. Make another invite and **Cancel invite**: its link now shows the plain message.
- [ ] Each parent signs in with their own email; sign out on one browser and the other stays signed in. Password reset: `npm run set-parent-login -w @hh/api -- <email>` (it prompts; nothing is printed).
- [ ] The demo family (`demo@example.com`) and the other seeded families (`smoke@`, `empty@`, `fresh@example.com`, all with the demo password) still sign in as before. The demo family can't invite.
- [ ] Assignments → **Add several**: add two or three books and Save; the undo bar says "Added 3 assignments. Undo" and one tap removes exactly those. **Import CSV**: a file with 60 rows imports in one go ("Imported 60 assignments. Undo") and one tap removes all 60. After you check in a week that includes one of them, Undo says it can't be undone any more.
- [ ] 320 px and dark mode: the join page, the Parents card and the undo bar don't scroll sideways and every button and link is easy to tap. Scenario: `node flow.mjs accounts` (scripts/smoke; it makes its own family with the command, so it needs no seed).


**View-only access (Sprint 15):** run `npm run demo` and the seed script first (`smoke@example.com`). Nothing is emailed; you copy the links yourself.
- [ ] Sign in as `smoke@example.com`, Set up → Family settings → **View-only access**: type a label ("Co-op"), **Create a sign-up link**; the link shows once with Copy link. Open it in a private window: "View {family}", create a login (or "I already have an account").
- [ ] The viewer lands on Schedule with a **View only** label and the family's name; the bar or rail has Schedule and Records only. Week: change week and child, open a bar (a read-only detail with only Close), Print sheets. Year: zoom, month and child, open a bar. Records: range and child, Export, Term in review. There is no add, edit, Log, Delete, Update status, Copy or More anywhere, and typing /setup in the address goes back to Schedule.
- [ ] As the parent, the card lists the viewer with name, email and joined date; **Remove** asks first. Reload the viewer's window: it is signed out. The used link and a made-up link show the same plain message.
- [ ] One login, two accounts: a viewer who also has a family (join the link with "I already have an account" using that family's login) sees "Switch to {family}" in the Account menu, and in that family's menu "Switch to {co-op} (View only)"; signing in again opens the account used last.
- [ ] 320 px and dark mode: nothing scrolls sideways and every control is easy to tap. Scenario: `node flow.mjs view-only` (scripts/smoke; it needs the seed and leaves its viewer removed). Set `CHROME_PATH` to the Chromium you have.

