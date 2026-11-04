# Sprint 12 verification ("Did Frank finish...?" and the needs-you dot)

This is the tester pass for Sprint 12, ticket S12-08. It covers S12-01 to S12-07 and S12-09 (commits 39e093b..97d1528) on branch `claude/test-coverage-analysis-6dehbu` at 97d1528. Date: 2026-11-04 (the machine's date, which is the app's "today").

I changed no product code, test code or scripts. This report and the ten screenshots in `docs/reviews/sprint-12/` are the only files I added.

> **Independence note:** I am a separate tester agent and did not write the Sprint 12 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: READY for the PR to main (no High or Medium findings; two Lows and one note)

Every answer path works in a real browser at 320, 360, 390, 800 and 1280 px in light and dark, and Undo reverses each one. The dot appears and clears without a reload, never lights for a late line or a heavy week, and has the right accessible name. Finished and stopped work is drawn as the ticket says, and it vanishes from the late lines, the heavy week and later Week bars. Change an answer works from the Year edit sheet and the Assignments form, including "Not ended". S12-09's three items work. Logging, Records and the setup flow are untouched. The gate is ALL GREEN and all 25 smoke scenarios pass, `completion` included.

One finding is a visible gap (N1: at 320 px a stopped bar can have no label at all), and one is a design observation (N2: the commonest answer takes two taps). Neither needs to hold the PR.

## Numbers

- **Gate:** `bash scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate), run once, on a clean tree, with nothing else running.

  | Package | Tests |
  |---|---|
  | engine | 435 (and 435 in each of the 7 `test:tz` zones) |
  | api | 1102 |
  | web | 1452 |
  | db | 163 |

  These match the developer's S12-09 counts exactly.
- **Tickets:** 8 of 8 pass their "Done when" (S12-01 to S12-07 and S12-09). S12-04 passes with N1 beside it. S12-08 is this report.
- **Smoke:** one full round, **all 25 scenarios exit 0** (`auth axe-2a axe-log axe completion edge engine-version full-flow kids-add kids-edit kids-list login new-family plan-debug records s2a-12-hub s2a-13-settings s2a-14-assignments s2a-15-days-off s2a-16-events s2a-17 s2a-hardening subjects-add subjects-edit subjects-list tap-targets`). `completion` ends "completion scenario: ok"; `new-family` ends "PROBLEMS: none"; `tap-targets` ends "No undersized controls on the listed screens." No scenario printed a page error. I reset the database before each scenario. **Disclosure:** `kids-edit` failed in my first pass because my reset wiped the "Keyboard Kid" that `kids-add` creates for it; run straight after `kids-add` it passes. That is how the two scenarios are meant to run, not a product problem.
- **Tap targets:** `tap-targets` also ran at 320, 390 and 1280 px with a non-demo login (`smoke@example.com`): "No undersized controls" each time (the Add event form included).
- **Answer-path sweep:** one script, run at **10 combinations** (320, 360, 390, 800, 1280 px, light and dark), each on the smoke family. About 95 checks per run. **Result: 9 of 10 runs fully clean; the 2 runs at 320 px each fail one check (N1).** Page errors: 0. No sideways scroll anywhere. Axe: 0 violations on Home with the card, the answer sheet, the several-list sheet, Year with ended bars, the Year edit sheet, the Change sheet, Week, and the Assignments edit form, in both themes. No control under 44 px in the card, the sheets, the Change row, the undo bar, the nav, or the Assignments edit form.
- **S12-09 sweep:** another script, also at **10 combinations**, each on a brand-new family: 27 checks per run, **all clean**.
- **Findings:** 0 High, 0 Medium, 2 Low (N1, N2), 1 note (N3).

## Setup

- Postgres 16 (role hh/hh) on 127.0.0.1:5432, scratch database `hh12_dev` (migrated, seeded with `db/demo.ts --no-serve` and `scripts/smoke/seed-second-family.ts`). **The database is dropped at the end.**
- API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173, both bound to loopback only; stopped afterwards. Nothing was exposed and nobody was contacted.
- Browser: Playwright's Chromium for my scripts; the repo's puppeteer smoke scripts ran with `CHROME_PATH` set to the same binary and `SCREENS_DIR` outside the repo. Axe-core 4.x from `scripts/smoke/node_modules`. Nothing installed.
- The scratch family was `smoke@example.com` (the demo data under another login). Its one waiting question on Nov 4 is "Did Margaret finish A Child's Garden of Verses?" (ended Oct 30). To get several waiting I added assignments through the app's API that ended yesterday and the day before, and archived them afterwards (the API has no delete). My scripts live in the tester's scratchpad and are not committed.

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S12-01 Store how it ended | **Pass** | The API round-trips every answer I made from the UI: `endedAs`/`endedOn` read back as `finished`/2026-10-30, `stopped`/2026-11-04 (today), and `null` after Undo or Not ended. "Not yet" sends `{ endDate }` and leaves `endedAs` null. Undo labels read "Marked A Child's Garden of Verses finished.", "Moved A Child's Garden of Verses' end to Nov 11.", "Reopened T-Alpha." The gate covers validation and the migration (11 API + 3 DB tests); I did not probe those by hand. |
| S12-02 Waiting list | **Pass** | On Nov 4 the demo family has exactly one question, the poems (ended Oct 30). An assignment that ended yesterday waits; one that ends today or later does not; one answered does not; one whose end I moved a week on stops waiting, and **comes back** when I set its end to yesterday and reload (Home: "Did ... finish ...? Ended Nov 3"). Several waiting are listed oldest first (poems Oct 30, then Nov 2, then Nov 3). Every child on the assignment is named: "Did Frank and Margaret finish T-Beta?". |
| S12-03 The question on Home | **Pass** | See "Answer paths". One waiting is a card above the briefing line; several are "3 assignments ended" plus "Answer them". Spans both panes from 840 px (card left 160, width 1040 at 1280; 120 and 640 at 800, in line with the content column). |
| S12-04 Finished and stopped on the schedule | **Pass** (N1) | See "Year view". |
| S12-05 The dot | **Pass** | See "The dot". |
| S12-06 Change an answer | **Pass** | See "Change an answer". |
| S12-07 Docs and smoke | **Pass** | `completion` passes in the full round. The demo seed gives the one expected question. LOCAL_TESTING and the scenario read as the progress note says. |
| S12-09 Sprint 11 leftovers | **Pass** | See "S12-09". |
| S12-08 Tester pass | This report | |

## Answer paths (from Home)

Checked at all 10 combinations. "Day it defaults to" is what the date field shows when the sheet opens.

| Path | What I saw |
|---|---|
| **Yes, finished** | The sheet opens on **Oct 30, 2026, the stored end date** (not today). Save: the card is gone at once, the Home link drops to plain "Home" and the dot goes **without a reload**, the API says finished on Oct 30, the undo bar says "Marked A Child's Garden of Verses finished. Undo". Undo: the card and the dot come back, `endedAs` is null again. |
| **Not yet** | Opens on **a week from today (Nov 11)** with "The question comes back after this day." A day before today is refused in words ("Pick today or a later day, or the question comes straight back."). Save: the end moves to Nov 11, the card goes, the label is "Moved ... end to Nov 11." Undo puts Oct 30 back and the question returns. **The question comes back once the new end passes:** after setting the end to yesterday, a reload shows "Ended Nov 3" and the question again. |
| **We stopped** | Opens on **today (Nov 4)**. Save: the API says stopped on Nov 4, the card and dot go, Undo reopens it. |
| **Several waiting** | Three waiting: card says "3 assignments ended" with "A Child's Garden of Verses, T-Beta and 1 more", Home link "Home, 3 things need you". "Answer them" opens a sheet with three rows, each with the three choices, oldest first. Cancel in an answer returns to the list. Answering one removes its row and returns to the list; the name goes "3, 2, 1 things need you", then plain "Home" and the sheet closes after the last. Final API state: Alpha finished, Beta open with its end a week on, poems stopped. |
| **Undo for each answer** | Yes, Not yet and We stopped each undone from the bar. Also Undo after "Not ended" from the Assignments form (it reopened, then Undo put "finished" back). |

The answers all go through the sheet's date step (a developer decision), so each answer is two taps. See N2.

## The needs-you dot

- **Appears and clears without a reload:** the Home link's name goes "Home, 1 thing needs you" to plain "Home" the moment the last answer is saved, and comes back after Undo. It also **appears** without a reload: on Set up > Assignments, Change > Not ended on an assignment that ended Nov 2 lit the dot within a moment (the name read "Home, 1 thing needs you").
- **Where:** the bottom bar at 320, 360 and 390 px (the nav is fixed at the bottom, 70 px tall) and the rail at 800 and 1280 px (fixed on the left, 80 px wide). In both it is a 10 x 10 px dot on the Home icon's corner (`home-question-360-light.png`, `home-question-rail-dot-800-dark.png`).
- **Colour:** rgb(63, 107, 92) in light and rgb(156, 203, 184) in dark, the fern accent. Never red.
- **Accessible name:** the Home link's `aria-label` is "Home, 1 thing needs you" / "Home, 2 things need you" / "Home, 3 things need you", and the dot is `aria-hidden`. The label starts with the visible word, and axe's label-content-name check is clean.
- **Never for warnings:** with the late line showing ("The Secret Garden will finish about 3 weeks late at this pace.") and nothing waiting, no dot and the name is plain "Home". With eight assignments giving "This is a heavy week for Frank." on top of the late line, still no dot (`heavy-and-late-no-dot-390-light.png`). Reopening an assignment whose end has not passed (Secret Garden) lights nothing.

## Year view: finished and stopped bars

- **Finished:** drawn in the lighter step of the subject's colour with a check after the name ("T-Alpha ✓", "Times tables ✓"). It looks calmer than an open bar. It keeps its whole planned length even when it was finished early (the developer's documented decision; I checked a bar finished today against a Dec 18 end and its right edge stayed at Dec 18).
- **Stopped:** drawn muted with a **dashed** outline (stroke dash 4px 3px) and the label "A Child's Garden of Verses · Stopped". It **ends at its stop date**: an assignment planned to Dec 18 and stopped today ends at the Today line (right edge x=424 against the line at x=423). See N1 for the one case where the label goes missing.
- **Not in the briefing:** a stopped or finished Secret Garden (which is otherwise late) drops its late line from the Week briefing and from Home (also "1 running late" on Home's Schedule card). Eight overlapping assignments make "This is a heavy week for Frank."; finishing or stopping them on Nov 1 (before the week) makes the line go. A big assignment that ended yesterday and was then stopped never appears in the briefing or Home's glances.
- **Not in later Week bars:** assignments stopped or finished a week before this week's Monday, with ends later in the month, have no bar in this week's Week view, while the matching open control does. (The "Frank's work" list still lists work up to the day an assignment ended, so T-Alpha, finished yesterday, still shows this week. That is right.)
- Year in both themes at all five widths: no sideways scroll, axe clean, no undersized control. Screens: `year-finished-stopped-360-light.png`.

## Change an answer

- **Year edit sheet:** tapping a finished bar opens the sheet with "Finished Nov 3" and a **Change** button (44 px). Change opens a sheet with "Yes, finished", "Not yet", "We stopped" and **"Not ended"**, plus "Not ended opens it again. It asks you again if its end has passed." (`change-answer-390-light.png`). Changing Finished to "We stopped" keeps the day it ended on as the default and saves: the bar becomes stopped. The sheet then says "Stopped Nov 3". **Not ended** reopens it; since its end (Nov 3) has passed, Home shows the question again and the dot comes back.
- **Assignments form:** the card line says "Finished Nov 3". Opening it shows the same row and Change. Change > We stopped > Save closes the form and the card now says "Stopped"; reopening shows "Stopped ..." and Change > Not ended reopens it (the card line goes).
- Axe clean on the Year edit sheet, the Change sheet and the Assignments edit form, both themes.

## S12-09

- **Header at 320 px (N7):** the wordmark is one line (141 x 24 px, 16.8 px type, `white-space: nowrap`) and Sign out is one line (79 x 45 px), 20 px from the right edge. At 360 px and above the wordmark is 155 x 27. No sideways scroll, axe clean, both themes (`s09-header-320-dark.png`).
- **Clear a saved school year (N8):** after step 4 saved dates and "Three terms", Back shows Three terms selected. Choosing "I'll set this later" and Continue **asks first**: "Clear the saved dates?" "Your school year, Aug 17, 2026 to May 21, 2027, is cleared and you can set it later. Breaks and term views you already added stay." (`s09-clear-dates-320-light.png`). Cancel keeps the saved year and stays on step 4. "Clear the dates" removes the year (`schoolYear` is null in `/api/family`), moves to step 5, and **keeps the 2 breaks and the three Term views**. Back then shows "I'll set this later" chosen and no dates. Continue with no year saved asks nothing. After finishing, Home shows "Set your school year"; setting it from that reminder removes the reminder and leaves a saved year. **No reminder shows beside a saved year.** Native `<dialog>`: 44 px buttons, axe clean.
- **Icons hint (N9):** reads "Tap an icon in the left column to see the subject's name." At 1280 px the banner is **640 px wide** (not the full 1200 px column); at 800 px 624; at 390, 360 and 320 px it spans the content (342, 312, 272 px), inside the viewport. "Got it" is 44 px. Axe clean, both themes (`s09-icons-hint-1280-light.png`).

## Regressions

- **Sprint 11 setup flow:** the `new-family` scenario passes ("PROBLEMS: none"), and my own S12-09 walk drove steps 1 to 6 and Home at ten width and theme combinations on new families. Back keeps the shape, the breaks are not duplicated by Back, and the Home reminders match the choices made.
- **Records and logging untouched:** I added a log entry (Margaret, Oct 26 to 28, 45 minutes of Literature) and recorded `/api/log-entries`, `/api/records/totals` and the Records page text. Then I ran the whole answer sweep (finish, stop, move, reopen, Change, Undo, Not ended) and compared them: **byte-identical**. The log, progress-check-in, week-override and record tables were also identical before and after. Logging never changes because of an answer.

## Five-second check

Question: does the card catch the eye without alarming? **Yes.** On Home it is the first thing under the greeting: a bordered card in the subject's colour (a thick rule and round badge), a big serif question ("Did Margaret finish A Child's Garden of Verses?"), "Ended Oct 30" in grey, and one dark-fern "Yes, finished" button next to two quiet ones. No red, no warning icon, no urgency words. The briefing line below it is a quiet tinted pill and clearly the second thing. A parent can say what it is and what to do within five seconds. Small point: at 360 px "We stopped" wraps to a second row alone beside nothing (`home-question-360-light.png`); at 320 px the three stack, which looks better. Cosmetic.

## Findings

### N1 (Low): at 320 px a stopped bar can show no name and no "Stopped"

At the default Year zoom at 320 px, a stopped bar whose name does not fit beside it gets no label at all, so a parent sees a small dashed box with nothing to say what it is or that it stopped. The ticket says the bar "says 'Stopped'". At 360 px and wider the same bar reads "A Child's Garden of Verses · Stopped". The label that includes " · Stopped" is longer than a finished one, so it loses the room first. The bar still shows as dashed and tapping it opens "Stopped Nov 4", and (from the code) the screen-reader lane list adds ", stopped", so nothing is lost for a parent who taps. It is only the picture that is unlabelled.

Steps to reproduce:
1. Sign in as the demo family under another login (or the demo), make "A Child's Garden of Verses" (Margaret, Oct 5 to Oct 30) stopped, for example by Home > We stopped > Save.
2. Open Schedule > Year at 320 px wide (default zoom, "All children").
3. Look in Margaret's section: a dashed stub with no text (`n1-stopped-bar-no-label-320-light.png`). At 360 px the label "A Child's Garden of Verses · Stopped" is drawn beside it.

Suggested fix: when the full label does not fit, keep "Stopped" (or a shortened title plus "Stopped") and drop the title first.

### N2 (Low): the commonest answer takes two taps

"Yes, finished" opens a sheet with the date and Save, so a parent who just wants to say yes taps twice and sees a date field they do not need. The developer chose this on purpose (so each answer shows the day it will save, and the ticket asks for it to be editable); Undo and Change cover mistakes. Will may prefer "Yes, finished" to save at once with the end date and offer the day on the undo bar or under Change. Not a defect against the tickets.

### N3 (note): a finished-early bar keeps its whole planned length

Finishing an assignment today that was planned to Dec 18 draws its bar to Dec 18 with a check (the developer recorded this as a decision: "the bar keeps its place"). Week bars, check-in weeks and heavy-week counts do stop at the day it ended. A parent might expect the bar to end at the day they said it finished. Raising it so Will can say yes or no.

### Observed and fine

- Archiving is the only way to remove an assignment through the API (no DELETE route); not a Sprint 12 matter.
- The demo reseed (`db/demo.ts`) works against a running API (no restart needed).

## What Will should look at first

1. **Home at 360 px with the demo family:** the question card and its three buttons (`home-question-360-light.png`). Say aloud what you would tap, and whether two taps for "Yes, finished" is right (N2).
2. **Tap "Not yet" and then "Save", then look at Undo:** the new end is a week from today and the question returns after it. Try the same on a family with more than one waiting ("3 assignments ended").
3. **Schedule > Year with a stopped bar at 320 px (N1):** a dashed stub with no words.
4. **A finished bar that was planned to run later (N3):** it is drawn to its planned end with a check. Is that what you meant by "keeps its place"?
5. **The dot:** answer the last question and watch the Home icon (bottom bar on a phone, rail at 800 px). Then open Week with a late line showing: no dot.
6. **Set up > school year, "I'll set this later" with a year saved:** the "Clear the saved dates?" question reads clearly (`s09-clear-dates-320-light.png`).

## What I did not check

- Heavy week and late lines were made with test data (eight overlapping assignments; the demo's Secret Garden). I did not hand-craft a "no progress" or "doesn't fit" line to confirm those two are also silent for ended work; the engine tests cover them.
- The "Not yet" path from Change was exercised only through the "Not ended" and "We stopped" choices in the browser; the engine and the 12 web tests for Change cover "Not yet" there.
- The path variants (Change, heavy and late, week bars, S12-09 clear) ran at each of the ten combinations through the same scripts; the manual screenshot review covered 360, 390, 800 and 1280 in light and dark and 320 in light and dark for the question and the setup header.
- One smoke round, with the database reset before each scenario.
- Chromium only; no Safari or real phone.
