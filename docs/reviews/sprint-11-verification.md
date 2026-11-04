# Sprint 11 verification (the first-run flow, Schedule hints)

This is the tester pass for Sprint 11, ticket S11-08. It covers S11-01 to S11-07 (commits 6b7fc3e..9c98c70) on branch `claude/test-coverage-analysis-6dehbu` at 9c98c70. Date: 2026-11-04 (the machine's date).

I changed no product code, test code or scripts. This report and the ten screenshots in `docs/reviews/sprint-11/` are the only files I added.

> **Independence note:** I am a separate tester agent and did not write the Sprint 11 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: NOT READY for a PR to main (two Mediums, both small)

The flow works end to end. A brand-new family can be walked through every path (children required, every Skip and "later", all four year shapes, Back, Finish later). Resume works after a real sign-out and sign-in. Existing families never see it. Home shows only reminders. The three hints show once, one at a time, and "Show tips again" brings them back. The gate is ALL GREEN, the full smoke round passes, axe is clean on every flow screen in both themes at all four widths, and no control is under 44 px.

Two Medium findings hold it back, following the 10a/10b convention that one Medium means NOT READY:

- **N1 (data):** going Back to step 4 forgets the shape the parent chose. The cards reset to "Fall and Spring", and the natural "Back, look, Continue" silently re-applies that default and throws away "Three terms".
- **N2 (dead end):** once a parent says "I'll set this later" for the school year, the only way back to that question is the Home reminder, and "Hide" removes the reminder for good (on that browser, for every family). Nothing in Set up asks for the year's dates. This contradicts the README's "Every skipped step stays editable in Set up".

Both are small. After they are fixed, re-check step 4, the Home reminder and Hide only. Everything else can go to main as is. Findings N3 to N6 are Low.

## Numbers

- **Gate:** `bash scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate). Run once, on a clean tree.

  | Package | Tests |
  |---|---|
  | engine | 420 (and 420 in each of the 7 `test:tz` zones) |
  | api | 1082 |
  | web | 1357 |
  | db | 158 |

  These match the developer's S11-07 counts exactly.
- **Tickets:** 7 of 7 pass their "Done when". S11-03 passes with N1 beside it, S11-05 with N4 and N2 beside it. S11-08 is this report.
- **Smoke:** one full round, **all 25 scenarios exit 0** (`auth axe-2a axe-log axe edge engine-version full-flow kids-add kids-edit kids-list login new-family plan-debug records s2a-12-hub s2a-13-settings s2a-14-assignments s2a-15-days-off s2a-16-events s2a-17 s2a-hardening subjects-add subjects-edit subjects-list tap-targets`). The seed was run again before each scenario. `new-family` ends "PROBLEMS: none". No page errors; the only console noise is the 401s that `auth`/`login` cause on purpose. In addition `tap-targets` at 320, 390 and 1280 px with a non-demo login: "No undersized controls on the listed screens." each time.
- **Browser sweep:** the whole flow (steps 1 to 6, "You're all set", Home) at 320, 360, 390 and 1280 px in light and dark = **8 runs, each on its own brand-new family**. Per screen: axe (wcag defaults, resultTypes violations), controls under 44 px, sideways scroll, page errors. **Result: 0 axe violations, 0 undersized controls, 0 sideways scroll, 0 page errors.** The one undersized thing on Home is the off-screen "Skip to content" link (107 x 23), which the developer already noted as older and unchanged.
- **Findings:** 0 High, 2 Medium (N1, N2), 4 Low (N3 to N6).

## Setup

- Postgres 16 (role hh/hh) on 127.0.0.1:5432, scratch database `hh11_dev`, migrated to 021, seeded with `db/demo.ts --no-serve` and `scripts/smoke/seed-second-family.ts`. The database is dropped at the end.
- API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173, both bound to loopback only. Nothing was exposed and nobody was contacted.
- Browser: Playwright's Chromium (`/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`) with axe-core 4.14.0 from `scripts/smoke/node_modules`. The repo's smoke scripts ran with `CHROME_PATH` set to that binary and `SCREENS_DIR` outside the repo.
- Each path test used its own brand-new family (a copy of the `fresh@example.com` row under another login, since a family that has been through the flow cannot be reused). My scripts are in the tester's scratchpad and are not committed.

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S11-01 The flow's frame | **Pass** | A new family lands on `/welcome` step 1 with "Step 1 of 6", a progress bar (`role=progressbar`, now 2 of 6 on step 2, label "Setup progress"), no tab bar, "Back" from step 2, "Finish later" from step 3 only. Focus moves to the h1 on every step. The demo, `smoke@` and `empty@` families sign in to Home; typing `/welcome` for them goes Home; their `/api/me` says `setupDone: true`. **Resume with a real sign-out:** at step 3, (A) `POST /api/auth/logout` plus clearing sessionStorage, then signing in again in the same browser opens step 3; (B) closing the whole browser context and signing in from a new one opens step 3; (C) Finish later, Home, Sign out in the UI, sign in again opens step 3. A reload on Home after Finish later stays on Home, and a deep link to `/schedule` opens as normal (the developer's documented choice). |
| S11-02 Family, children, days | **Pass** (cosmetic N3) | Step 1: the name starts as "Fresh family"; a blank name says "Give your family a name."; Monday/Sunday. Step 2: no Skip; Continue with nobody says "Add at least one child to continue."; children are saved as added (Set up lists them; Back to step 2 shows them; Continue with an empty box moves on with both). Step 3: Mon to Fri ticked, unticking all five and Continue says "Pick at least one school day." and stays; Mon to Thu saved. |
| S11-03 Year and shape | **Pass** (N1, N2) | Each shape on its own family, dates Aug 17, 2026 to May 21, 2027. Fall and Spring: "Adds Fall and Spring views." and the two overrides, no breaks. Three terms: "Adds 3 term views and 2 breaks: Nov 9–22, Feb 15–28." and the API shows 2 breaks (2026-11-09..22, 2027-02-15..28) and the views Term 1 (Aug 17 to Nov 8), Term 2 (Nov 23 to Feb 14), Term 3 (Mar 1 to May 21) with Fall and Spring hidden. 36 weeks: "Adds nothing yet; you can add breaks next." and no breaks, no views. 6 weeks on, 1 off: 5 breaks (Sep 28, Nov 16, Jan 4, Feb 22, Apr 12) as previewed. "I'll set this later" saves nothing and the reminder shows. Validation messages read in plain words: no dates ("Pick the first and last day of the school year."), end before start, and 502 days ("That range is 502 days; the most allowed is 400."). **Back and re-apply:** re-pressing Continue never duplicates breaks (2, 2, 2; 5, 5, 5) and no Term view is added twice. But see N1. |
| S11-04 Breaks | **Pass** | The holidays of the year's range are unticked. Add a break needs a name and dates (messages shown). **Add breaks** saves ticked holidays and added breaks; it stays off until something is ticked or added. **I'll get back to you on this** saves nothing and Home shows "Add your breaks". **Skip** saves nothing and Home shows no breaks row. Going Back to step 5 and ticking Thanksgiving again did not add a second one (1 break before and after). With the year left for later, step 5 still opens and offers Add breaks, later and Skip; I did not read which months its holidays list covers. |
| S11-05 Subjects, then Home | **Pass** (N2 and N4 beside it) | 14 starter chips with icons, none ticked; Math and Literature ticked, Continue: created with the default icon and the next free colour (checked for Math, a calculator, #2f6fb0, and Latin, a different colour; I did not read Literature's icon). "Add your own" adds a ticked chip, and typing "Math" just ticks the Math chip. "You're all set" has no Back and no assignment step. Home after the flow shows no "Add your books and lessons" and no assignment prompt, and no checklist at all when nothing was put off. With year later, breaks later and subjects skipped Home shows exactly "Set your school year", "Add your breaks", "Add subjects". Each reminder opens its own step (`/welcome?only=year`, `?only=breaks`; no progress bar; the year one has "Save", the breaks one has the three buttons) and goes to Home afterwards with that row gone. |
| S11-06 Hints | **Pass** (N5) | See "Hints" below. |
| S11-07 Docs and smoke | **Pass** | The `new-family` scenario passes ("PROBLEMS: none"). `LOCAL_TESTING.md` explains `fresh@example.com` and the seed; it worked as written. |
| S11-08 Tester pass | This report | |

## The checks Will asked for

### The whole flow at 320, 360, 390 and 1280, light and dark

All 8 runs walked: step 1 to Continue; step 2 with Continue on empty (error shown), two children; step 3 with zero days (error), Mon to Thu; step 4 with all five shapes selected (previews recorded), Three terms with dates; step 5 with Thanksgiving ticked, the Add a break form open with "Fall break" Oct 12 to 16, Add breaks; step 6 with Math and Literature, Continue; "You're all set"; Go to Home. Every screen: axe clean, no control under 44 px, no sideways scroll. The longest screens (step 4, step 5, step 6) are tall but scroll normally at 320. Screenshots: `step3-days-360-dark.png`, `step4-year-320-dark.png`, `step5-breaks-360-light.png`, `step6-subjects-360-light.png`.

### Children are required; every Skip / later path

- **Children:** no Skip and no Finish later on steps 1 and 2; Continue on an empty step 2 refuses with a message. Pass.
- **Year later + breaks later + subjects skipped:** Home shows three reminders (`home-reminders-360-light.png`); each opens its single step and clears (`reminder-year-only-360-light.png`).
- **Year set, breaks Skip, subjects Skip:** only "Add subjects" remains (N4).
- **Year set, breaks "I'll get back to you":** only "Add your breaks" (this is what the smoke scenario checks too).
- **Add breaks:** ticked holidays and added breaks show up as days off; none are saved by the other two buttons.
- **Finish later** on step 3: Home shows only "Add subjects" (the flow had not reached the year or breaks, so nothing was put off); the flow returns at the next sign-in at step 3.

### Resume after a real sign-out and sign-in

Passes in three variations, listed under S11-01 above. Closing the session in the middle of step 3 and signing in again resumes at step 3 each time. The developer only tested a reload; this covers the real thing.

### Existing families never see the flow

Passes for the demo, `smoke@example.com` and `empty@example.com`: sign-in lands on Home, `/welcome` redirects to Home, `setupDone: true`, and Schedule shows no hint (all three hints are marked seen for them). The empty family's Home shows only "Add your children" and "Add subjects".

### Home: reminders only

Confirmed in the runs above: no "Add your books and lessons" row, no first-assignment prompt, no "A few steps and your year is planned." line. The list goes when nothing is left.

### Hints

Tested at all 8 widths and themes on a family that had two children, a subject and an assignment (so Year has a bar), created through the app's own API.

- **One at a time, in context:** Year shows exactly one hint: "Thicker bars mean more work each day. Tap one to change it." Got it shows exactly one other: "Tap an icon to see the subject's name." Got it again shows none. Opening a bar first shows the edit hint ("Change the start or end and the rest of the plan adjusts.") in the sheet, and counts the bars hint as seen (stored `{bars,edit}`); after the sheet closes the icons hint comes next. A reload keeps the stored state; Week and Home show none.
- **Nothing blocks the screen:** `role="status"`, no `aria-modal`, no full-screen fixed layer, "Got it" is the topmost element at its centre, 60 x 44 px at every width, keyboard focusable. The bubbles stay inside the viewport at 320 (x 28 to 308 and x 50 to 308). See N5 for what they cover.
- **Show tips again:** Family settings has a "Tips" card; the button says "The tips will show again on Schedule." and clears `tips_seen`; the bars hint is back on Year.
- Axe was clean with each hint showing and with the edit sheet open, in both themes.

### Tap targets and axe

Covered in "Numbers". No undersized control on any flow screen, the two single-step reminder screens, Home, the hints or Family settings; axe is clean on all of them.

## Five-second judgement of each step

Question for each: could a parent who has never seen this say what it is and what to do next?

| Step | Verdict | Why |
|---|---|---|
| 1 Your family | **Yes** | One question and a pre-filled name; a parent just taps Continue. "Our week starts on" is plain. |
| 2 Your children | **Yes, with a flaw** | "Who are you teaching?" with a name box is immediate. "Add another" next to "Continue" reads right. The colour dot beside a saved child is drawn as a stretched oval (N3), which looks like a bug at first sight. |
| 3 School days | **Yes** | Seven chips with Mon to Fri on. The question is the label. |
| 4 School year | **Mostly** | The two dates and the five cards are clear. This is the busiest screen: two jobs (dates and shape) on one page. The preview line ("Adds 3 term views and 2 breaks: Nov 9–22, Feb 15–28.") sits below the cards and only appears once dates are typed, so on a phone it is easy to miss, and "term views" is the app's word, not the parent's. "36 weeks, No pattern of breaks" will puzzle a parent who has not met the others. |
| 5 Breaks | **Mostly** | The holiday list is clear. The three buttons are not: "I'll get back to you on this" and "Skip" differ only in whether Home keeps a reminder, and a parent cannot tell that from the labels. "Add breaks" is faint and disabled until something is ticked, which is correct but looks broken to some. |
| 6 Subjects | **Yes** | Chips with icons, nothing ticked, "Add your own". Continue is off until one is chosen; Skip is right under it. |
| All set | **Yes** | One sentence and one button. "Anything you skipped is waiting in Set up" is not true for the school year (N2). |

## Findings

### N1 (Medium): Back to step 4 forgets the chosen shape, and Continue re-applies the default

Back keeps the two dates but resets the shape cards to "Fall and Spring". The shape is not stored, so the natural "go Back to look, then Continue" quietly applies Fall and Spring.

Steps to reproduce:
1. Sign in as a new family, go to step 4, type Aug 17, 2026 and May 21, 2027, pick **Three terms**, Continue. (`GET /api/family` shows Term 1, Term 2, Term 3 and Fall and Spring hidden; 2 breaks.)
2. On step 5 press **Back**. Step 4 shows the dates, with **Fall and Spring** selected.
3. Press **Continue** without touching anything.

Result: the three term views are gone and the Fall and Spring overrides are back; the two breaks stay. The parent's choice of Three terms was changed without a word. With "36 weeks" or "6 weeks on, 1 off" the same Back, Continue adds Fall and Spring views they did not pick.

Related, and listed by the developer as a decision: switching shape after applying one adds breaks on top. Three terms then 6 on 1 off left five breaks that are neither plan (Sep 28, Nov 9, Jan 4, Feb 15, Apr 12). The cards do not warn about it. Breaks stay editable in Days off, so this part is Low by itself.

Suggested fix: remember the shape (for example on the family, like the dates) and show it ticked on Back; or do not re-apply when nothing changed.

### N2 (Medium): the school year can only be set from the Home reminder, and Hide removes it for good

Set up has no screen for the school year's dates and shape. After "I'll set this later" the only door is the Home row "Set your school year" (`/welcome?only=year`). That row sits in the Getting started card, which has a "Hide" button. Hide writes `hh.checklist.hidden` to the browser's localStorage. The key is not per family, there is no "show again", and it also hides every later reminder.

Steps to reproduce:
1. Walk a new family through the flow, choosing "I'll set this later" on step 4 (also "I'll get back to you" on step 5).
2. On Home press **Hide** in Getting started. The card disappears and stays gone after a reload.
3. Open Set up: Children, Subjects, Assignments, Days off and breaks, Events, Family settings. None asks for the school year.
4. Sign out and sign in as another family in the same browser that has a reminder: its card is hidden too.

Result: a parent who hides the card has no route back to the year question (typing `/welcome?only=year` works but nobody knows it). This contradicts the README's "Every skipped step stays editable in Set up". The same Hide hides the breaks reminder, though Days off is a second route for that one.

Suggested fix: a row in Set up for the school year (opening `/welcome?only=year`), and make Hide per family or show a way back.

### N3 (Low): the colour dot beside a saved child is a stretched oval

On step 2, after "Add another", the saved child is listed with a wide coloured oval (about 134 x 18 px at 360, wider at 1280) instead of a round dot, and the name is pushed to the right. Seen at every width and in both themes (`step2-children-360-light.png`).

Steps to reproduce: new family, step 2, type "Frank", press Add another.

Cause, from `features/welcome/welcome.css`: `.welcome-list li > span { flex: 1 }` also catches the colour dot, which is a span. It is cosmetic only.

### N4 (Low): Skip on the subjects step still leaves a Home reminder

The developer noted it as a decision ("Add subjects" shows when there are none). But the README says Home shows only the reminders for steps put off, and Skip on the breaks step means no reminder. A parent who chose Skip on subjects sees "Add subjects" on Home immediately. Will may want to confirm that is what he meant.

Steps to reproduce: new family, any year, breaks Skip, on step 6 press Skip, Go to Home.

### N5 (Low): the hint bubbles cover what they point at

They do not block anything (Got it works, no overlay), but at 360 px:
- the bars hint covers the second bar and the "Frank" row header;
- the icons hint covers the first bar's label and most of the bar (`hint-bars-360-light.png`, `hint-icons-360-light.png`).

Steps to reproduce: a family with an assignment, `tips_seen` empty, Schedule, Year at 360 px. With only one assignment the first one is fine; with two, the second bar is hidden under the bars bubble until Got it.

### N6 (Low): no way out of the flow except Finish later

During the flow there is no family menu, no Sign out and no Set up. On a shared device or the wrong login a parent has to tap "Finish later" (from step 3) before they can sign out. Steps 1 and 2 have no exit at all, which follows from "children are the only required step". Closing the tab works.

### Observed and fine

- Duplicate child names ("Frank" and "frank") are accepted in step 2; I did not check whether Set up allows the same. Not raised as a finding.
- The Home family button and "Skip to content" (23 px, off-screen) are older and unchanged.

## What Will should look at first

1. **Step 4, then Back, then Continue (N1).** Pick Three terms, press Back from step 5 and Continue: it turns into Fall and Spring. Quick to see, quick to fix.
2. **Skip the year on step 4, then press Hide on Home (N2).** Then look in Set up for a place to give the school year. There is none.
3. **Step 2 after "Add another" (N3).** The stretched blue oval is the first thing a new parent will see after typing a child's name.
4. **Step 5's three buttons.** Say aloud what "I'll get back to you on this" does that "Skip" does not. Also the Skip on step 6 that still leaves "Add subjects" on Home (N4).
5. **Schedule's Year with two assignments and a fresh family (N5).** Check the bubbles do not hide what a parent needs.

## What I did not check

- The path variants (each Skip and later path, the four shapes, Back and re-apply, resume, validation) ran at 360 px, light, on separate families. Only the straight walk and the hints ran at all 8 width and theme combinations.
- I did not open the Days off screen to read the added breaks; I read them from `GET /api/blocked-ranges` (the smoke scenario and the developer's notes cover the screen).
- One smoke round, not three, with the seed run again before every scenario.
- Safari and real phones were not used; Chromium only, as the environment has no other browser.
